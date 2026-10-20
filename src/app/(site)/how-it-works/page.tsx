import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, FileSignature, Handshake, Landmark, ShieldCheck, Upload, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/badges";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "From SPA verification to DLD transfer: how distressed off-plan assignments work, end to end.",
};

const steps = [
  { icon: Upload, t: "Seller submits the unit", d: "SPA, Oqood, statement of account and ID are uploaded through a secure form." },
  {
    icon: BadgeCheck,
    t: "We verify with the developer",
    d: "Our transactions team confirms ownership, amount paid, any arrears and the developer's resale policy.",
  },
  { icon: Building2, t: "Listing goes live", d: "The unit is published with a verified badge, its payment plan and a true-cost breakdown." },
  { icon: Handshake, t: "Buyers make offers", d: "Offers, counters and acceptance happen in the dashboard. We qualify every buyer before the NOC." },
  {
    icon: FileSignature,
    t: "Developer NOC & assignment",
    d: "We apply for the NOC, settle the developer's admin fees and prepare the assignment agreement.",
  },
  {
    icon: Wallet,
    t: "Settlement",
    d: "On transfer day the buyer pays the seller's equity by manager's cheque at the trustee office — never before the NOC.",
  },
  {
    icon: Landmark,
    t: "DLD transfer",
    d: "The Oqood is updated to the buyer. The seller is paid and the buyer takes over the remaining payment plan.",
  },
];

export default function HowItWorks() {
  return (
    <div className="container-page py-16">
      <SectionHeading
        eyebrow="End to end"
        title="How a distressed off-plan transfer works"
        sub="Typical timeline: 2–5 weeks from accepted offer to new Oqood, depending on the developer."
      />
      <ol className="relative ms-4 mt-12 space-y-8 border-s ps-8">
        {steps.map((s, i) => (
          <li key={s.t} className="relative">
            <span className="absolute -start-[49px] grid h-8 w-8 place-items-center rounded-full border-4 border-background bg-gold text-gold-foreground">
              <s.icon className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular">Step {i + 1}</p>
            <h3 className="mt-1 font-sans text-lg font-semibold">{s.t}</h3>
            <p className="mt-1 max-w-xl text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink-gradient p-8 text-primary-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ShieldCheck className="h-10 w-10 shrink-0 text-gold" />
          <p className="max-w-md text-lg">
            Every step is handled by a RERA-licensed broker. Nobody pays us unless the transfer completes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="gold">
            <Link href="/deals">Browse deals</Link>
          </Button>
          <Button asChild variant="heroOutline">
            <Link href="/sell">Sell my unit</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
