import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSignature, Landmark, ShieldCheck } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { FeeCalculator } from "@/components/FeeCalculator";
import { StepsCard } from "@/components/Steps";
import { SectionHeading } from "@/components/badges";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { BUYER_STEPS, FAQS, HERO_IMAGE, SELLER_STEPS } from "@/lib/content";
import { formatAEDCompact } from "@/lib/format";
import { featuredDeals, marketStats, watchedIds } from "@/lib/listings";

export default async function Home() {
  const user = await getCurrentUser();
  const [featured, stats, watched] = await Promise.all([featuredDeals(6), marketStats(), watchedIds(user?.id)]);

  const strip: [string, string][] = [
    ["Live units", stats.live.toLocaleString("en-AE")],
    ["Inventory value", stats.value ? formatAEDCompact(stats.value) : "—"],
    ["Avg. discount vs launch", stats.avgDiscount != null ? `${(stats.avgDiscount * 100).toFixed(1)}%` : "—"],
    ["Our fee", "2% + VAT"],
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="container-page pb-20 pt-28 sm:pt-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" /> RERA-licensed brokerage · Verified SPAs
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-primary-foreground sm:text-6xl">
            Buy Dubai off-plan <span className="text-gold">below launch price</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
            Take over verified payment plans from owners who need out. We handle the developer NOC, the paperwork and
            the DLD transfer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link href="/deals">
                Browse deals <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <Link href="/sell">Sell my unit</Link>
            </Button>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 bg-ink/60 backdrop-blur">
          <div className="container-page grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
            {strip.map(([l, v]) => (
              <div key={l}>
                <p className="text-2xl font-semibold text-primary-foreground tabular sm:text-3xl">{v}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Featured"
            title="Deepest discounts right now"
            sub="Verified units with motivated sellers, ranked by discount to today's launch price."
          />
          <Button asChild variant="outline">
            <Link href="/deals">
              View all deals <ArrowRight />
            </Link>
          </Button>
        </div>
        {featured.length ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => (
              <DealCard key={d.id} deal={d} watching={watched.has(d.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">New deals are being verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free account and save a search to hear first when units go live.
            </p>
            <Button asChild className="mt-5">
              <Link href="/signup">Get early access</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="bg-secondary py-20">
        <div className="container-page">
          <SectionHeading center eyebrow="How it works" title="Verify → List → Match → Transfer" />
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <StepsCard title="For sellers" steps={SELLER_STEPS} />
            <StepsCard title="For buyers" steps={BUYER_STEPS} />
          </div>
        </div>
      </section>

      <section className="container-page grid items-center gap-12 py-20 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Simple pricing"
            title="2% + VAT. Only on success."
            sub="No listing fees, no retainers. We're paid when the transfer completes at the DLD — and not a dirham before."
          />
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/fees">
              See full fee breakdown <ArrowRight />
            </Link>
          </Button>
        </div>
        <FeeCalculator />
      </section>

      <section className="bg-ink-gradient py-20 text-primary-foreground">
        <div className="container-page">
          <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">Why buyers and sellers trust us</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [Landmark, "RERA-licensed brokerage", "A regulated Dubai brokerage acts for you from offer to transfer."],
                [BadgeCheck, "Verified SPAs", "Every SPA and payment history is checked with the developer before going live."],
                [ShieldCheck, "Protected settlement", "The seller is paid at the DLD trustee office only when ownership moves to you."],
                [FileSignature, "NOC handled", "We manage the developer NOC, assignment and Oqood update end to end."],
              ] as const
            ).map(([Icon, t, d]) => (
              <div key={t} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6">
                <Icon className="h-6 w-6 text-gold" />
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-primary-foreground/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-20">
        <SectionHeading center eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-start text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
