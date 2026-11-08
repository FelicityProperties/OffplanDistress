import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorker";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import { LocaleGuard } from "@/components/LocaleGuard";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/client";
import { dirOf, htmlLang, type Locale } from "@/i18n/config";
import { getLocale, getPagePath } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { BRAND_INK, manifestHref, PWA_THEME } from "@/lib/pwa";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/site-copy";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

/** The toast region's accessible name, in the page's language. */
const NOTIFICATIONS: Record<Locale, string> = { en: "Notifications", ar: "الإشعارات", zh: "通知" };

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap", axes: ["opsz"] });
// Arabic faces only download on Arabic pages (they're referenced from [dir=rtl] rules), so no preload.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});
const naskh = Noto_Naskh_Arabic({
  variable: "--font-arabic-display",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const [locale, path] = await Promise.all([getLocale(), getPagePath()]);
  // Canonical + hreflang for the current page (the proxy names its path without /ar or /zh); pages with their own
  // canonical (/deals, a deal, /market) replace these.
  const alternates = path ? alternatesFor(path, locale) : undefined;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${BRAND.name} — ${SITE_TAGLINE[locale]}`, template: `%s · ${BRAND.name}` },
    description: SITE_DESCRIPTION[locale],
    ...(alternates ? { alternates } : {}),
    openGraph: { ...openGraphBase(locale), ...(alternates?.canonical ? { url: alternates.canonical } : {}) },
    twitter: { card: "summary_large_image" },
    // The installable app in the page's language (src/lib/pwa.ts). On iOS: its home-screen name, and a status bar that
    // stays dark-on-light over the cream header. No phone or address links made up from the licence numbers (ORN
    // 33951, BRN 59244, …): real tel: and mailto: links still work.
    manifest: manifestHref(locale),
    appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

// viewport-fit=cover: the page runs under the notch and the home indicator, and the fixed bars keep clear of them with
// the safe-area insets (globals.css). The browser's bar stays ink; the installed app's status bar is cream like the
// header (the first matching theme-color wins).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [{ media: "(display-mode: standalone)", color: PWA_THEME }, { color: BRAND_INK }],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      // "zh-CN" for Chinese: globals.css picks the Simplified Chinese system faces from it (nothing is downloaded).
      lang={htmlLang(locale)}
      dir={dirOf(locale)}
      className={`${inter.variable} ${fraunces.variable} ${plexArabic.variable} ${naskh.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={organizationJsonLd()} />
        <I18nProvider locale={locale}>
          {/* A public page reached in-app in another language than this frame's is loaded again, whole. */}
          <LocaleGuard />
          {children}
          <Toaster position="top-center" richColors dir={dirOf(locale)} containerAriaLabel={NOTIFICATIONS[locale]} />
          {/* The installable app: the offline page's service worker, the install card and the offline notice. */}
          <ServiceWorkerRegistrar />
          <InstallPrompt />
          <OfflineBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
