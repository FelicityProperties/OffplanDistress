// Shared pieces for the link-preview images (Open Graph) that WhatsApp, X, LinkedIn etc. show when a page is
// shared. Rendered by next/og, which supports a subset of CSS (flexbox only, inline styles).

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

/**
 * A remote photo as a data URL, or null when it can't be fetched quickly: a preview image must never fail
 * because a photo host is slow.
 */
export async function photoDataUrl(url: string | undefined | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
