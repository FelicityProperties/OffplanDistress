import { Mail } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getT } from "@/i18n/server";

/** Home page: the daily newsletter's sign-up, an ink panel under the featured deals (src/lib/newsletter.ts). */
export async function NewsletterBand({ defaultEmail }: { defaultEmail?: string }) {
  const t = await getT("newsletter");
  return (
    <section aria-labelledby="newsletter-band-title" data-testid="newsletter-band" className="container-page pb-24 reveal">
      <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-6 py-12 text-primary-foreground shadow-lift sm:px-14 sm:py-14">
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-70" />
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              <Mail className="h-3.5 w-3.5" aria-hidden /> {t("band.eyebrow")}
            </p>
            <h2 id="newsletter-band-title" className="mt-4 text-3xl font-semibold leading-tight text-primary-foreground sm:text-4xl">
              {t("band.title")}
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/75">{t("band.body")}</p>
          </div>
          <NewsletterForm variant="band" source="home" defaultEmail={defaultEmail} />
        </div>
      </div>
    </section>
  );
}
