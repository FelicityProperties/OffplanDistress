import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ArrowRight, SearchX } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { openGraphBase } from "@/lib/seo";

// Also the metadata of a page that calls notFound() (a withdrawn deal, say): its own title, and no canonical, hreflang
// or og:url naming an address that doesn't exist.
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("common"), getLocale()]);
  return { title: t("notFoundTitle"), robots: { index: false }, alternates: null, openGraph: openGraphBase(locale) };
}

export default async function NotFound() {
  const t = await getT("common");
  return (
    <>
      {/* The skip link and main landmark of every other page (src/app/(site)/layout.tsx). */}
      <a
        href="#main"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lift focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
        className="relative isolate flex min-h-[65vh] flex-1 items-center justify-center overflow-hidden px-4 py-20 outline-none"
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 bg-glow-gold opacity-40" />
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-card text-gold shadow-card ring-1 ring-border">
            <SearchX className="h-6 w-6" />
          </span>
          <p className="mt-6 font-display text-8xl font-semibold leading-none text-gradient-gold tabular">404</p>
          <h1 className="mt-4 text-2xl font-semibold">{t("notFoundTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link href="/deals">
                {t("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
