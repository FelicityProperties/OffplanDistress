import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileCheck2, FileSignature, Handshake, Wallet } from "lucide-react";
import { SellForm } from "@/components/sell/SellForm";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("sell");
  return { title: t("meta.title"), description: t("meta.description") };
}

// Reassurance strip under the heading. Copy: sell `pitch.<key>.title` / `.body`.
const REASSURANCE = [
  [Wallet, "noFee"],
  [BadgeCheck, "verified"],
  [FileSignature, "paperwork"],
] as const;

export default async function SellPage() {
  const [user, t, tc, tm] = await Promise.all([getCurrentUser(), getT("sell"), getT("common"), getT("marketing")]);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute -end-40 -top-32 -z-10 h-[28rem] w-[28rem] bg-glow-gold opacity-40" />
        <div className="container-page pb-10 pt-12 sm:pb-12 sm:pt-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {tm("sell.eyebrow")}
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl">{t("page.title")}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("page.subtitle")}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {REASSURANCE.map(([Icon, key]) => (
              <li key={key} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-card backdrop-blur">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t(`pitch.${key}.title`)}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{t(`pitch.${key}.body`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page py-10 sm:py-12">
        {user ? (
          // SellForm opens with its own step indicator (top margin dropped here) and renders its form card + summary.
          // The tinted frame starts at sm: on phones a card inside a card would squeeze the form fields.
          <div className="*:first:mt-0 sm:rounded-3xl sm:border sm:border-border/70 sm:bg-secondary/50 sm:p-6 sm:shadow-card lg:p-8">
            <SellForm needsPhone={!user.phone} />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-lift sm:p-10">
              <h2 className="text-2xl font-semibold sm:text-3xl">{t("pitch.title")}</h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{t("pitch.body")}</p>
              <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border/70 bg-secondary/60 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-gradient text-gold">
                  <Handshake className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{t("pitch.buyers.title")}</span>
                  <span className="text-sm text-muted-foreground">{t("pitch.buyers.body")}</span>
                </span>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/signup?intent=sell&next=/sell">{t("pitch.signup")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login?next=/sell">{t("pitch.login")}</Link>
                </Button>
              </div>
            </div>
            <aside className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient p-6 text-primary-foreground shadow-lift sm:p-8">
              <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
              <div aria-hidden className="absolute -end-16 -top-16 -z-10 h-56 w-56 bg-glow-gold opacity-40" />
              <p className="inline-flex items-center gap-2 font-semibold text-gold">
                <FileCheck2 className="h-4 w-4" aria-hidden />
                {t("needs.title")}
              </p>
              <ul className="mt-5 space-y-3 text-sm text-primary-foreground/85">
                {[tc("file.spa"), tc("file.oqood"), t("needs.soa"), t("needs.id")].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-primary-foreground/15 pt-4 text-xs leading-relaxed text-primary-foreground/60">{t("needs.later")}</p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
