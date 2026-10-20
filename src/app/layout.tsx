import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/client";
import { dirOf } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { BRAND } from "@/lib/config";
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
  const locale = await getLocale();
  const ar = locale === "ar";
  const tagline = ar ? "منصة دبي للوحدات على الخارطة المتعثرة" : BRAND.tagline;
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://localhost:3000"),
    ),
    title: { default: `${BRAND.name} — ${tagline}`, template: `%s · ${BRAND.name}` },
    description: ar
      ? "اشترِ وحدات دبي على الخارطة بأقل من سعر الإطلاق. يعرض الملاك الذين يرغبون في الخروج وحداتهم، ونتحقق نحن من المستندات ونطابق المشترين ونتولى شهادة عدم الممانعة ونقل الملكية."
      : BRAND.description,
    openGraph: { siteName: BRAND.name, type: "website", images: ["/logo.svg"], locale: ar ? "ar_AE" : "en_AE" },
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
        <I18nProvider locale={locale}>
          {children}
          <Toaster position="top-center" richColors dir={dirOf(locale)} />
        </I18nProvider>
      </body>
    </html>
  );
}
