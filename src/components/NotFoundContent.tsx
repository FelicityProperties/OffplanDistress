import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ArrowRight, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { openGraphBase } from "@/lib/seo";

// The 404 page, in its two places: src/app/not-found.tsx (an address no route matches, shown on its own in the root
// layout) and src/app/(site)/not-found.tsx (a page that calls notFound(): a withdrawn or mistyped deal, a missing
// dashboard or admin listing, shown inside the site layout).

/** Its own title, and no canonical, hreflang or og:url naming an address that doesn't exist. */
export async function notFoundMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("common"), getLocale()]);
  return { title: t("notFoundTitle"), robots: { index: false }, alternates: null, openGraph: openGraphBase(locale) };
}

/** Classes of the box that holds NotFoundContent: a <main> of its own, or a <div> in the site layout's <main>. */
export const NOT_FOUND_BOX = "relative isolate flex min-h-[65vh] flex-1 items-center justify-center overflow-hidden px-4 py-20";

/** The message and the two ways on (the deals, home) over a faint grid. */
export async function NotFoundContent() {
  const t = await getT("common");
  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
      <div aria-hidden className="absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 bg-glow-gold opacity-40" />
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-card text-gold shadow-card ring-1 ring-border">
          <SearchX className="h-6 w-6" />
        </span>
        <p className="mt-6 font-display text-8xl font-semibold leading-none text-gradient-gold tabular">404</p>
        <h1 className="mt-4 text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
        {/* Phones: two full-width 48px buttons, one under the other, in easy reach of a thumb. */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 max-sm:flex-col">
          <Button asChild className="rounded-full max-sm:h-12">
            <Link href="/deals">
              {t("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full max-sm:h-12">
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
