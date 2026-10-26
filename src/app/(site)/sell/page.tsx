import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Calculator, ExternalLink, FileCheck2, FileSignature, Handshake, MessageCircle, Wallet } from "lucide-react";
import { QuickEstimate } from "@/components/sell/QuickEstimate";
import { SellForm, type SellPrefill } from "@/components/sell/SellForm";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { BRAND, DEVELOPERS } from "@/lib/config";
import { nextQuarters, prefillFromParams } from "@/lib/estimate";
import { formatNumber } from "@/lib/format";
import { leadForSeller } from "@/lib/leads";

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

type Params = Awaited<PageProps<"/sell">["searchParams"]>;

/**
 * Where the sell form starts: the seller's own estimate (?lead=, from the estimate's thank-you link) or the exit
 * calculator's numbers (?spa=&paid=&handover=). A handover outside the form's quarters is left for the seller to pick.
 */
async function sellFormStart(user: SessionUser, params: Params): Promise<SellPrefill | undefined> {
  const quarter = (d: string | undefined) => (d && nextQuarters().includes(d) ? d : "");
  const lead = typeof params.lead === "string" ? await leadForSeller(params.lead, user.id) : null;
  if (lead) {
    const listed = DEVELOPERS.includes(lead.developer);
    return {
      leadId: lead.id,
      developer: listed ? lead.developer : "Other",
      developerOther: listed ? "" : lead.developer,
      projectName: lead.project ?? "",
      originalPrice: formatNumber(lead.spaPrice),
      amountPaid: formatNumber(lead.amountPaid),
      handoverDate: quarter(lead.handoverQuarter),
      arrears: lead.missed,
    };
  }
  const p = prefillFromParams(params);
  if (!p.spa) return undefined;
  return { originalPrice: formatNumber(p.spa), amountPaid: p.paid ? formatNumber(p.paid) : "", handoverDate: quarter(p.handover) };
}

export default async function SellPage({ searchParams }: PageProps<"/sell">) {
  const [user, t, tc, tm, params, tl] = await Promise.all([
    getCurrentUser(),
    getT("sell"),
    getT("common"),
    getT("marketing"),
    searchParams,
    getT("legal"),
  ]);
  const start = user ? await sellFormStart(user, params) : undefined;
  const prefill = prefillFromParams(params);
  // Signing up or logging in from the pitch keeps the exit calculator's numbers too: the sell form starts from them.
  const sellNext = encodeURIComponent(
    prefill.spa
      ? `/sell?${new URLSearchParams({
          spa: String(prefill.spa),
          ...(prefill.paid ? { paid: String(prefill.paid) } : {}),
          ...(prefill.handover ? { handover: prefill.handover } : {}),
        })}`
      : "/sell",
  );

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
          <p className="mt-5 flex items-start gap-2.5 text-sm text-muted-foreground">
            <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" aria-hidden />
            <span className="min-w-0">
              {t("page.calculatorHint")}{" "}
              <Link href="/exit-calculator" className="font-semibold text-foreground underline decoration-gold/60 underline-offset-4 hover:decoration-gold">
                {t("page.calculatorLink")}
              </Link>
            </span>
          </p>
          {/* WhatsApp intake: our team prepares the listing from the documents, the seller confirms it by link. */}
          {BRAND.whatsapp && (
            <section
              aria-labelledby="sell-whatsapp"
              className="mt-6 flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white">
                  <MessageCircle className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="sell-whatsapp" className="font-sans text-base font-semibold leading-snug">
                    {t("whatsapp.title")}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("whatsapp.body")}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{t("whatsapp.note")}</p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 self-start sm:self-center">
                <a
                  href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm("whatsapp.prefill.sell"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="sell-whatsapp"
                >
                  <MessageCircle aria-hidden /> {t("whatsapp.cta")}
                  <ExternalLink className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  <span className="sr-only">{tl("newTab")}</span>
                </a>
              </Button>
            </section>
          )}
        </div>
      </section>

      <div className="container-page py-10 sm:py-12">
        {user ? (
          // SellForm opens with its own step indicator (top margin dropped here) and renders its form card + summary.
          // The tinted frame starts at sm: on phones a card inside a card would squeeze the form fields.
          <div className="*:first:mt-0 sm:rounded-3xl sm:border sm:border-border/70 sm:bg-secondary/50 sm:p-6 sm:shadow-card lg:p-8">
            <SellForm needsPhone={!user.phone} initial={start} userId={user.id} />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Free estimate first: a number before any sign-up wall. #estimate is where the exit calculator links to. */}
            <QuickEstimate id="estimate" initial={prefill} signedIn={false} className="lg:col-span-2" />
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
                  <Link href={`/signup?intent=sell&next=${sellNext}`}>{t("pitch.signup")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={`/login?next=${sellNext}`}>{t("pitch.login")}</Link>
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
