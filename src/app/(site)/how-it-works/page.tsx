import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, FileSignature, Handshake, Landmark, ShieldCheck, Upload, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("how.metaTitle"), description: t("how.metaDescription") };
}

// Step copy: marketing `how.<id>.title` / `how.<id>.desc`.
const steps = [
  { icon: Upload, id: "submit" },
  { icon: BadgeCheck, id: "verify" },
  { icon: Building2, id: "live" },
  { icon: Handshake, id: "offers" },
  { icon: FileSignature, id: "noc" },
  { icon: Wallet, id: "settlement" },
  { icon: Landmark, id: "transfer" },
] as const;

export default async function HowItWorks() {
  const [t, tc] = await Promise.all([getT("marketing"), getT("common")]);
  return (
    <div className="container-page py-16">
      <SectionHeading eyebrow={t("how.eyebrow")} title={t("how.title")} sub={t("how.sub")} />
      <ol className="relative ms-4 mt-12 space-y-8 border-s ps-8">
        {steps.map((s, i) => (
          <li key={s.id} className="relative">
            <span className="absolute -start-[49px] grid h-8 w-8 place-items-center rounded-full border-4 border-background bg-gold text-gold-foreground">
              <s.icon className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular">
              {t("how.step", { n: i + 1 })}
            </p>
            <h3 className="mt-1 font-sans text-lg font-semibold">{t(`how.${s.id}.title`)}</h3>
            <p className="mt-1 max-w-xl text-muted-foreground">{t(`how.${s.id}.desc`)}</p>
          </li>
        ))}
      </ol>
      <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink-gradient p-8 text-primary-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ShieldCheck className="h-10 w-10 shrink-0 text-gold" />
          <p className="max-w-md text-lg">{t("how.cta")}</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="gold">
            <Link href="/deals">{tc("browseDeals")}</Link>
          </Button>
          <Button asChild variant="heroOutline">
            <Link href="/sell">{tc("sellMyUnit")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
