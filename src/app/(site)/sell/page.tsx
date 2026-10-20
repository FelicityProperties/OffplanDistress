import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileSignature, Handshake, Wallet } from "lucide-react";
import { SellForm } from "@/components/sell/SellForm";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("sell");
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function SellPage() {
  const [user, t, tc] = await Promise.all([getCurrentUser(), getT("sell"), getT("common")]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("page.title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("page.subtitle")}</p>

      {user ? (
        <SellForm needsPhone={!user.phone} />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-semibold">{t("pitch.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("pitch.body")}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [BadgeCheck, "verified"],
                  [Handshake, "buyers"],
                  [FileSignature, "paperwork"],
                  [Wallet, "noFee"],
                ] as const
              ).map(([Icon, key]) => (
                <li key={key} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t(`pitch.${key}.title`)}</span>
                    <span className="text-sm text-muted-foreground">{t(`pitch.${key}.body`)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/signup?intent=sell&next=/sell">{t("pitch.signup")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login?next=/sell">{t("pitch.login")}</Link>
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl bg-ink-gradient p-6 text-primary-foreground">
            <p className="font-semibold text-gold">{t("needs.title")}</p>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
              <li>• {tc("file.spa")}</li>
              <li>• {tc("file.oqood")}</li>
              <li>• {t("needs.soa")}</li>
              <li>• {t("needs.id")}</li>
            </ul>
            <p className="mt-6 text-xs text-primary-foreground/60">{t("needs.later")}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
