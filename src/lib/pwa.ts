import "server-only";
import type { MetadataRoute } from "next";
import { dirOf, htmlLang, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { tFor } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { SITE_DESCRIPTION } from "@/lib/site-copy";

// The installable app: one web app manifest per language (src/app/manifest/[file]/route.ts), linked from every page's
// <head> by src/app/layout.tsx with its colours. Icons: scripts/make-app-icons.mjs.

/** The site's cream background (--background): the splash screen, and the installed app's status bar, under the header. */
export const PWA_BACKGROUND = "#fbf9f4";
export const PWA_THEME = "#fbf9f4";
/** The logo's ink: the browser's bar colour on the site itself, as before the app existed. */
export const BRAND_INK = "#141c33";

/** The manifest of a language's pages. A file address, so src/proxy.ts and localePath() leave it as it is. */
export function manifestHref(locale: Locale) {
  return `/manifest/${locale}.webmanifest`;
}

const png = (src: string, size: number, purpose: "any" | "maskable") =>
  ({ src, sizes: `${size}x${size}`, type: "image/png", purpose }) as const;

export function buildManifest(locale: Locale): MetadataRoute.Manifest {
  const tc = tFor("common", locale);
  const ta = tFor("app", locale);
  const tn = tFor("notifications", locale);
  const shortcut = (name: string, shortName: string, url: string, icon: string) => ({
    name,
    short_name: shortName,
    url,
    icons: [{ src: `/icons/shortcut-${icon}.png`, sizes: "96x96", type: "image/png" }],
  });
  return {
    // The app's identity: the implicit id of the first manifest (start_url "/"), so a copy installed then stays the same
    // app. Never change it.
    id: "/",
    // Latin in every language, like the logo.
    name: BRAND.name,
    short_name: BRAND.name,
    description: SITE_DESCRIPTION[locale],
    lang: htmlLang(locale),
    dir: dirOf(locale),
    // Opens in the language it was installed in (an installed iOS app has a cookie jar of its own); launches show up as
    // source "pwa" in /admin/analytics.
    start_url: `${localePath("/", locale)}?utm_source=pwa`,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: PWA_BACKGROUND,
    theme_color: PWA_THEME,
    categories: ["business", "finance", "shopping"],
    prefer_related_applications: false,
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    icons: [
      png("/icons/icon-192.png", 192, "any"),
      png("/icons/icon-512.png", 512, "any"),
      png("/icons/icon-maskable-192.png", 192, "maskable"),
      png("/icons/icon-maskable-512.png", 512, "maskable"),
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // Long-press on the home-screen icon. No utm tags: /deals filters and saved searches read the query string.
    shortcuts: [
      shortcut(tc("browseDeals"), ta("tabs.deals"), localePath("/deals", locale), "deals"),
      shortcut(tc("sellMyUnit"), ta("tabs.sell"), localePath("/sell", locale), "sell"),
      shortcut(tn("shell.watchlist"), ta("tabs.watchlist"), "/dashboard/watchlist", "watchlist"),
    ],
  };
}
