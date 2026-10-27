import Link from "@/components/LocaleLink";
import { ArrowRight, SearchX } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT("common");
  return (
    <>
      <SiteHeader />
      <main className="relative isolate flex min-h-[65vh] flex-1 items-center justify-center overflow-hidden px-4 py-20">
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
