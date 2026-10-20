import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, CalendarClock, Eye, FileCheck2, TrendingDown } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { Gallery } from "@/components/deals/Gallery";
import { OfferDialog } from "@/components/deals/OfferDialog";
import { InquiryDialog } from "@/components/InquiryForm";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, FEES, PUBLIC_STATUSES, UNIT_TYPES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED, formatDate, formatPct, formatQuarter, parseRefCode, refCode } from "@/lib/format";
import { getListingByRef, similarDeals, watchedIds } from "@/lib/listings";

async function load(ref: string) {
  const refNo = parseRefCode(ref);
  if (!refNo) return null;
  return getListingByRef(refNo);
}

export async function generateMetadata({ params }: PageProps<"/deals/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  const row = await load(ref);
  if (!row || !PUBLIC_STATUSES.includes(row.listing.status)) return { title: "Deal unavailable", robots: { index: false } };
  const l = row.listing;
  const a = analyzeDeal(l);
  const pct = a.discountVsLaunch && a.discountVsLaunch > 0 ? ` — ${Math.round(a.discountVsLaunch * 100)}% below launch` : "";
  const title = `${UNIT_TYPES[l.unitType]} in ${l.projectName}${pct}`;
  const description = `${l.developer}, ${l.community}. ${formatPct(a.paidPct)} paid, handover ${formatQuarter(l.handoverDate)}. Take over the payment plan for ${formatAED(l.askingPrice)} upfront.`;
  return {
    title,
    description,
    openGraph: { title, description, images: l.images[0]?.startsWith("http") ? [l.images[0]] : undefined },
  };
}

export default async function DealDetail({ params }: PageProps<"/deals/[ref]">) {
  const { ref } = await params;
  const [row, user] = await Promise.all([load(ref), getCurrentUser()]);
  if (!row) notFound();
  const l = row.listing;
  const isOwner = user?.id === l.sellerId;
  const isAdmin = user?.role === "admin";
  if (!PUBLIC_STATUSES.includes(l.status) && !isOwner && !isAdmin) notFound();

  if (!isOwner && !isAdmin) {
    after(() => db.update(listings).set({ views: sql`${listings.views} + 1` }).where(eq(listings.id, l.id)));
  }

  const [similar, watched] = await Promise.all([similarDeals(l), watchedIds(user?.id)]);
  const a = analyzeDeal(l);
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const plan = l.paymentPlan ?? [];
  const loginHref = `/login?next=${encodeURIComponent(`/deals/${refCode(l.refNo)}`)}`;

  const cost: [string, number][] = [
    ["Asking price (seller equity)", l.askingPrice],
    ["Remaining balance to developer", a.remaining],
    ...(FEES.payer === "buyer"
      ? ([
          [`${BRAND.name} fee (2%)`, a.commission],
          ["VAT on fee (5%)", a.vat],
        ] as [string, number][])
      : []),
    ["DLD transfer fee (4%)", a.dld],
    ["DLD registration & trustee fees (est.)", a.dldAdmin],
    ["Developer NOC / admin (est.)", a.noc],
  ];

  return (
    <div className="container-page py-8">
      <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to deals
      </Link>

      {l.status !== "live" && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
          {PUBLIC_STATUSES.includes(l.status)
            ? "The seller has accepted an offer on this unit. You can still save it or send a backup offer."
            : `Only you can see this page — the listing is currently “${l.status.replace(/_/g, " ")}”.`}
        </div>
      )}

      <Gallery
        images={l.images}
        alt={`${l.projectName}, ${l.community}`}
        badge={
          <div className="absolute start-4 top-4 flex gap-2">
            {discountPct != null && (
              <span className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground tabular">
                −{discountPct}% vs launch
              </span>
            )}
            {l.isSample && <SampleBadge className="self-center" />}
          </div>
        }
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">{l.developer}</span>
            {l.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                SPA & payment history verified
              </span>
            )}
            {l.nocEligible && <StatusPill tone="gold">NOC eligible</StatusPill>}
            <MotivationBadge m={l.motivation} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{l.projectName}</h1>
          <p className="mt-1 text-muted-foreground">
            {l.community} · {UNIT_TYPES[l.unitType]} · {l.sizeSqft.toLocaleString("en-AE")} sqft
            {l.floor ? ` · Floor ${l.floor}` : ""}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            {row.watchers} {row.watchers === 1 ? "person" : "people"} watching · Ref {refCode(l.refNo)}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
            {[
              ["View", l.view || "—"],
              ["Handover", formatQuarter(l.handoverDate)],
              ["Original price", formatAED(l.originalPrice)],
              ["Launch price today", l.launchPrice ? formatAED(l.launchPrice) : "Being assessed"],
            ].map(([k, v]) => (
              <div key={k} className="bg-card p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 text-sm font-semibold tabular">{v}</p>
              </div>
            ))}
          </div>

          {l.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-muted-foreground">{l.description}</p>}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Payment plan</h2>
            <div className="mt-4 rounded-xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  Paid to developer <span className="font-semibold tabular">{formatAED(l.amountPaid)}</span>
                </span>
                <span className="text-muted-foreground">
                  Remaining <span className="font-semibold text-foreground tabular">{formatAED(a.remaining)}</span>
                </span>
              </div>
              <Progress value={Math.round(a.paidPct * 100)} className="mt-3 h-3" />
              <p className="mt-2 text-xs text-muted-foreground tabular">
                {formatPct(a.paidPct)} paid
                {l.nextInstalmentDate &&
                  ` · Next instalment ${l.nextInstalmentAmount ? formatAED(l.nextInstalmentAmount) : ""} on ${formatDate(l.nextInstalmentDate)}`}
              </p>
            </div>
            {plan.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Milestone</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-end">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.map((s, i) => (
                      <TableRow key={`${s.label}-${i}`}>
                        <TableCell className="font-medium">{s.label}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(s.dueDate)}</TableCell>
                        <TableCell className="text-end tabular">{formatAED(s.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">True cost to you</h2>
            <div className="mt-4 rounded-xl border bg-card p-5 shadow-card">
              <dl className="space-y-2.5 text-sm">
                {cost.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="tabular">{formatAED(v)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2.5 font-semibold">
                  <dt>Total all-in</dt>
                  <dd className="tabular">{formatAED(a.totalCost)}</dd>
                </div>
                {a.launchAllIn != null && (
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <dt>Buying new from the developer today (incl. 4% DLD)</dt>
                    <dd className="tabular">{formatAED(a.launchAllIn)}</dd>
                  </div>
                )}
              </dl>
              {a.savingVsLaunch != null && a.savingVsLaunch > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-success">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <TrendingDown className="h-5 w-5" />
                    Your net saving
                  </span>
                  <span className="text-xl font-semibold tabular">{formatAED(a.savingVsLaunch)}</span>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                DLD and developer fees are estimates and are confirmed when the NOC is issued.
              </p>
            </div>
          </section>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border bg-card p-6 shadow-lift">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pay seller now</p>
            <p className="mt-1 text-3xl font-semibold tabular">{formatAED(l.askingPrice)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              then {formatAED(a.remaining)} to {l.developer} per plan
            </p>
            {l.nextInstalmentDate && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 text-gold" />
                Next instalment {formatDate(l.nextInstalmentDate)}
              </div>
            )}
            <div className="mt-6 grid gap-2">
              <OfferDialog
                listingId={l.id}
                project={l.projectName}
                asking={l.askingPrice}
                signedIn={!!user}
                loginHref={loginHref}
                disabledReason={isOwner ? "This is your listing" : l.isSample ? "Sample listing" : undefined}
              />
              <WatchButton listingId={l.id} watching={watched.has(l.id)} variant="full" className="h-12" />
              <InquiryDialog
                listingId={l.id}
                project={l.projectName}
                defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
              />
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <FileCheck2 className="h-4 w-4 shrink-0 text-gold" />
              2% + VAT, charged only on successful transfer. We handle the NOC, assignment and DLD paperwork.
            </p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Similar deals</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <DealCard key={s.id} deal={s} watching={watched.has(s.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
