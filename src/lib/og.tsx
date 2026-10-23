// Shared pieces for the link-preview images (Open Graph) that WhatsApp, X, LinkedIn etc. show when a page is
// shared. Rendered by next/og, which supports a subset of CSS (flexbox only, inline styles).
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  ink: "#141c33",
  inkSoft: "#1d2a4d",
  gold: "#e0b45a",
  goldSoft: "#f5e7c4",
  cream: "#faf8f3",
  success: "#1e9e6f",
  muted: "rgba(250,248,243,0.68)",
};

/** The Frame mark from src/components/Logo.tsx, drawn with boxes. */
export function OgMark({ size = 56 }: { size?: number }) {
  const u = size / 32;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size, borderRadius: 8 * u, background: OG.cream }}>
      <div style={{ position: "absolute", left: 8 * u, top: 7 * u, width: 16 * u, height: 18 * u, background: OG.ink }} />
      <div style={{ position: "absolute", left: 12.2 * u, top: 11.2 * u, width: 7.6 * u, height: 13.8 * u, background: OG.cream }} />
      <div style={{ position: "absolute", left: 12.2 * u, top: 20.6 * u, width: 7.6 * u, height: 2.6 * u, borderRadius: 0.5 * u, background: OG.gold }} />
    </div>
  );
}

export function OgWordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <OgMark size={size * 1.4} />
      <div style={{ display: "flex", fontSize: size, color: OG.cream, letterSpacing: -1 }}>
        <span style={{ fontWeight: 700 }}>Offplan</span>
        <span style={{ opacity: 0.8 }}>Distress</span>
      </div>
    </div>
  );
}

const LOCAL_FILE = /^\/api\/files\/([0-9a-f-]{36})$/i;
// next/og can only draw these; anything else (WebP, AVIF, HEIC) would leave a blank panel.
const DRAWABLE = /^image\/(jpeg|png)$/i;
const MAX_BYTES = 4 * 1024 * 1024;

function dataUrl(mime: string, data: Uint8Array) {
  return `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
}

/**
 * A listing photo as a data URL, or null when it can't be used: a preview image must never fail because a
 * photo is missing, slow or in a format next/og can't draw. Uploaded photos (/api/files/<id>) come straight
 * from the database; remote ones are fetched with a short timeout.
 */
export async function photoDataUrl(url: string | undefined | null) {
  if (!url) return null;
  try {
    const id = LOCAL_FILE.exec(url)?.[1];
    if (id) {
      const [f] = await db
        .select({ mime: files.mimeType, size: files.size, data: files.data })
        .from(files)
        .where(and(eq(files.id, id), eq(files.kind, "photo")))
        .limit(1);
      return f && DRAWABLE.test(f.mime) && f.size <= MAX_BYTES ? dataUrl(f.mime, f.data) : null;
    }
    if (!/^https:\/\//i.test(url)) return null;
    const remote = new URL(url);
    // Unsplash picks WebP/AVIF from the Accept header unless a format is forced.
    if (remote.hostname === "images.unsplash.com") remote.searchParams.set("fm", "jpg");
    const res = await fetch(remote, { headers: { Accept: "image/jpeg,image/png" }, signal: AbortSignal.timeout(3000) });
    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !DRAWABLE.test(mime)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.length <= MAX_BYTES ? dataUrl(mime, buf) : null;
  } catch {
    return null;
  }
}

/** True when the text contains Arabic script, which next/og can neither shape nor (with its fallback font) parse. */
export function hasArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Renders the image up front so a rendering error (e.g. an unsupported glyph or image) turns into the
 * fallback card instead of a dropped connection halfway through the response.
 */
export async function renderOg(node: ReactElement, fallback: () => ReactElement, cacheSeconds: number) {
  const headers = {
    "Content-Type": "image/png",
    "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`,
  };
  try {
    return new Response(await new ImageResponse(node, OG_SIZE).arrayBuffer(), { headers });
  } catch (err) {
    console.error("[og] render failed, serving the fallback card", err);
    return new Response(await new ImageResponse(fallback(), OG_SIZE).arrayBuffer(), { headers });
  }
}
