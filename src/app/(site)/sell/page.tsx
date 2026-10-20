import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileSignature, Handshake, Wallet } from "lucide-react";
import { SellForm } from "@/components/sell/SellForm";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sell your off-plan unit fast",
  description:
    "List your Dubai off-plan unit in minutes. We verify it, market it to buyers, and handle the developer NOC and DLD transfer. Free for sellers.",
};

export default async function SellPage() {
  const user = await getCurrentUser();

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Sell my unit</h1>
      <p className="mt-1 text-muted-foreground">
        Five quick steps. Free for sellers — the buyer pays our fee only when the transfer completes.
      </p>

      {user ? (
        <SellForm needsPhone={!user.phone} />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-semibold">Create a free seller account to start</h2>
            <p className="mt-2 text-muted-foreground">
              You&apos;ll track verification, offers and the transfer from your dashboard. It takes under a minute.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [BadgeCheck, "Verified badge", "We check your SPA and payments with the developer."],
                  [Handshake, "Qualified buyers", "We screen buyers and negotiate offers for you."],
                  [FileSignature, "Paperwork handled", "Developer NOC, assignment and DLD transfer."],
                  [Wallet, "No fee for sellers", "Listing is free. You keep your asking price."],
                ] as const
              ).map(([Icon, t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/signup?intent=sell&next=/sell">Create seller account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login?next=/sell">I already have an account</Link>
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl bg-ink-gradient p-6 text-primary-foreground">
            <p className="font-semibold text-gold">What you&apos;ll need</p>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
              <li>• Sales & Purchase Agreement (SPA)</li>
              <li>• Oqood certificate</li>
              <li>• Latest statement of account from the developer</li>
              <li>• Passport or Emirates ID</li>
            </ul>
            <p className="mt-6 text-xs text-primary-foreground/60">Don&apos;t have them all yet? You can list now and upload later.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
