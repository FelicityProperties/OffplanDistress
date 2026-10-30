import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import { LocaleGuard } from "@/components/LocaleGuard";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/client";
import { dirOf, htmlLang, type Locale } from "@/i18n/config";
import { getLocale, getPagePath } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// The site's one-line description in each language, for <title> and the meta description (the English comes from
// BRAND); the Chinese follows the glossary (期房 = off-plan, 急售 = distressed, 开发商无异议函 = developer NOC).
const TAGLINE: Record<Locale, string> = {
  en: BRAND.tagline,
  ar: "منصة دبي للوحدات على الخارطة المتعثرة",
  zh: "迪拜急售期房交易平台",
};
const DESCRIPTION: Record<Locale, string> = {
  en: BRAND.description,
  ar: "اشترِ وحدات دبي على الخارطة بأقل من سعر الإطلاق. يعرض الملاك الذين يرغبون في الخروج وحداتهم، ونتحقق نحن من المستندات ونطابق المشترين ونتولى شهادة عدم الممانعة ونقل الملكية.",
  zh: "以低于开发商售价购入迪拜期房。急需退出的业主在此挂牌，我们核实文件、撮合买家，并办理开发商无异议函（NOC）与迪拜土地局（DLD）过户。",
};
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
    title: { default: `${BRAND.name} — ${TAGLINE[locale]}`, template: `%s · ${BRAND.name}` },
    description: DESCRIPTION[locale],
    ...(alternates ? { alternates } : {}),
    openGraph: { ...openGraphBase(locale), ...(alternates?.canonical ? { url: alternates.canonical } : {}) },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#141c33",
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
        </I18nProvider>
      </body>
    </html>
  );
}
