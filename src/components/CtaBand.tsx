import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

/** Closing call to action for sellers: ink panel with a gold glow, used at the end of marketing pages. */
export async function CtaBand() {
  const t = await getT("common");
  return (
    <section className="container-page py-20">
      <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-6 py-14 text-primary-foreground shadow-lift sm:px-14 sm:py-16">
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-70" />
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-primary-foreground sm:text-4xl">{t("cta.title")}</h2>
            <p className="mt-4 max-w-xl text-primary-foreground/75">{t("cta.body")}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="lg" variant="gold">
              <Link href="/sell">
                {t("cta.primary")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <Link href="/contact">{t("cta.secondary")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
