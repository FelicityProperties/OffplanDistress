import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import { LocaleGuard } from "@/components/LocaleGuard";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/client";
import { dirOf } from "@/i18n/config";
import { getLocale, getPagePath } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

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
  const ar = locale === "ar";
  // Canonical + hreflang for the current page (the proxy names its path without /ar); pages with their own canonical
  // (/deals, a deal, /market) replace these.
  const alternates = path ? alternatesFor(path, locale) : undefined;
  const tagline = ar ? "منصة دبي للوحدات على الخارطة المتعثرة" : BRAND.tagline;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${BRAND.name} — ${tagline}`, template: `%s · ${BRAND.name}` },
    description: ar
      ? "اشترِ وحدات دبي على الخارطة بأقل من سعر الإطلاق. يعرض الملاك الذين يرغبون في الخروج وحداتهم، ونتحقق نحن من المستندات ونطابق المشترين ونتولى شهادة عدم الممانعة ونقل الملكية."
      : BRAND.description,
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
      lang={locale}
      dir={dirOf(locale)}
      className={`${inter.variable} ${fraunces.variable} ${plexArabic.variable} ${naskh.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={organizationJsonLd()} />
        <I18nProvider locale={locale}>
          {/* A public page reached in-app in the other language than this frame's is loaded again, whole. */}
          <LocaleGuard />
          {children}
          <Toaster
            position="top-center"
            richColors
            dir={dirOf(locale)}
            containerAriaLabel={locale === "ar" ? "الإشعارات" : "Notifications"}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
