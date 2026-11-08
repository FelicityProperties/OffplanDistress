import { isLocale, LOCALES } from "@/i18n/config";
import { buildManifest } from "@/lib/pwa";

// The web app manifest of each language: /manifest/en.webmanifest, ar, zh (src/lib/pwa.ts), linked from the pages of
// that language by src/app/layout.tsx. Not app/manifest.ts: that file would win over metadata.manifest on every page,
// in English only. Written at build time. The address has a dot, so src/proxy.ts never sees it.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ file: `${locale}.webmanifest` }));
}

export async function GET(_request: Request, ctx: RouteContext<"/manifest/[file]">) {
  const { file } = await ctx.params;
  const locale = file.endsWith(".webmanifest") ? file.slice(0, -".webmanifest".length) : "";
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(buildManifest(locale)), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Checked on every use: a new name, icon or shortcut reaches installed apps on their next update check.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
