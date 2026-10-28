import Link from "next/link";
import { CalendarClock, FileCheck2, FilePlus2, FileUp, FileX2, ShieldCheck, UserPlus } from "lucide-react";
import { DeleteSamplesButton, ReviewButtons } from "@/components/admin/AdminControls";
import { FollowUps } from "@/components/admin/FollowUps";
import { PublishAttestedButton } from "@/components/admin/PublishAttested";
import { StatusPill, ToneStatus } from "@/components/badges";
import { Kpi, PageTitle } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { LISTING_STATUS } from "@/lib/config";
import { platformFee } from "@/lib/deal-math";
import { adminListings, adminStats, publishedAwaitingOwner } from "@/lib/admin";
import { todaySnapshot } from "@/lib/analytics-report";
import { leadStats } from "@/lib/leads";
import { formatAED, formatAEDCompact, formatDate, formatNumber, refCode } from "@/lib/format";
import { listingsWithoutPermitExpiry } from "@/lib/permits";
import { developerName } from "@/lib/place-names";
import { contactKinds } from "@/lib/typed-names";
import { cn } from "@/lib/utils";

/** Listings named in a "no permit expiry" banner; the rest are counted. */
const NO_EXPIRY_LINKS = 12;

/** Public listings whose permit expiry isn't tracked (listingsWithoutPermitExpiry): what to do, and the first few. */
function PermitBanner({
  icon: Icon,
  title,
  hint,
  rows,
  more,
  testId,
}: {
  icon: typeof CalendarClock;
  title: string;
  hint: string;
  rows: { id: string; refNo: number }[];
  more: string;
  testId: string;
}) {
  return (
    <div role="note" data-testid={testId} className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{hint}</p>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {rows.slice(0, NO_EXPIRY_LINKS).map((l) => (
            <Link key={l.id} href={`/admin/listings/${l.id}`} className="font-medium underline underline-offset-4 hover:no-underline">
              <bdi>{refCode(l.refNo)}</bdi>
            </Link>
          ))}
          {rows.length > NO_EXPIRY_LINKS && <span>{more}</span>}
        </p>
      </div>
    </div>
  );
}

// Typed by hand (not PageProps<"/admin">) so it compiles before Next regenerates its route types.
export default async function AdminQueue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [s, leads, inReview, t, tc, ta, ti, today, locale, params] = await Promise.all([
    adminStats(),
    leadStats(),
    adminListings("pending_review"),
    getT("admin"),
    getT("common"),
    getT("analytics"),
    getT("intake"),
    todaySnapshot(),
    getLocale(),
    searchParams,
  ]);
  const untracked = await listingsWithoutPermitExpiry();
  // Published before expiry dates were recorded, and published on the account owner's attestation without a number
  // (src/lib/attestation.ts): each under its own wording, so the team knows which is which.
  const noExpiry = untracked.filter((l) => !l.attested);
  const attested = untracked.filter((l) => l.attested);
  // Imported listings still filed under their network's placeholder owner (src/lib/import.ts) have their own tab, so
  // they don't bury the units our team can actually review.
  const tab = params.tab === "imported" ? "imported" : "review";
  const imported = inReview.filter((q) => q.awaitingOwner);
  const queue = tab === "imported" ? imported : inReview.filter((q) => !q.awaitingOwner);
  // Each import's waiting units can be published together on the account owner's attestation (adminPublishAttested);
  // once published they leave this tab but stay under the placeholder until the owner is entered, so they are listed.
  const sources = new Map<string, { name: string; count: number }>();
  for (const q of imported) {
    const key = q.source?.import;
    // (A sample is never an advert, so the action leaves it out too.)
    if (!key || q.isSample) continue;
    const entry = sources.get(key) ?? { name: q.source?.sourceName ?? key, count: 0 };
    entry.count++;
    sources.set(key, entry);
  }
  const publishedNoOwner = tab === "imported" ? await publishedAwaitingOwner() : [];

  return (
    <div className="space-y-6">
      <PageTitle title={t("queue.title")} sub={t("queue.sub")}>
        <div className="flex flex-wrap gap-2">
          {/* Staff-assisted intake: a listing from documents the seller sent on WhatsApp or by email. */}
          <Button asChild size="sm">
            <Link href="/admin/listings/new">
              <FilePlus2 aria-hidden /> {t("create.button")}
            </Link>
          </Button>
          {/* Many units at once, from a partner network's file (nothing goes public). */}
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/listings/import">
              <FileUp aria-hidden /> {ti("import.button")}
            </Link>
          </Button>
          <DeleteSamplesButton count={s.samples} />
        </div>
      </PageTitle>
      {/* Adverts that went live before permit expiry dates were recorded: the cron can't take them down on time. */}
      {noExpiry.length > 0 && (
        <PermitBanner
          icon={CalendarClock}
          testId="no-expiry-banner"
          title={noExpiry.length === 1 ? t("permits.noExpiry.one") : t("permits.noExpiry.many", { n: noExpiry.length })}
          hint={t("permits.noExpiry.hint")}
          rows={noExpiry}
          more={t("permits.noExpiry.more", { n: noExpiry.length - NO_EXPIRY_LINKS })}
        />
      )}
      {/* Adverts live on Felicity's own permit record, number not entered: buyers can't verify them with DLD yet. */}
      {attested.length > 0 && (
        <PermitBanner
          icon={ShieldCheck}
          testId="attested-banner"
          title={attested.length === 1 ? t("permits.attested.one") : t("permits.attested.many", { n: attested.length })}
          hint={t("permits.attested.hint")}
          rows={attested}
          more={t("permits.noExpiry.more", { n: attested.length - NO_EXPIRY_LINKS })}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label={t("queue.kpi.awaiting")} value={String(s.pending)} />
        {/* Sellers from the free estimate, waiting for a call */}
        <Link
          href="/admin/leads"
          className="rounded-xl border bg-card p-5 shadow-card transition hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-sm text-muted-foreground">{t("leads.kpi.new")}</p>
          <p className="mt-2 text-2xl font-semibold tabular">{leads.newLeads}</p>
          {leads.urgentNew > 0 && <p className="mt-1 text-xs font-medium text-destructive">{t("leads.kpi.urgent", { n: leads.urgentNew })}</p>}
        </Link>
        <Kpi label={t("queue.kpi.live")} value={String(s.live)} />
        <Kpi
          label={t("queue.kpi.inTransfer")}
          value={String(s.inTransfer)}
          hint={
            s.pipelineValue
              ? t("queue.kpi.pipelineFees", { amount: formatAEDCompact(platformFee(s.pipelineValue).total, locale) })
              : undefined
          }
        />
        <Kpi
          label={t("queue.kpi.feesEarned")}
          value={formatAEDCompact(platformFee(s.transferredValue).total, locale)}
          hint={t("queue.kpi.feesEarnedHint")}
        />
        {/* Today's visit statistics (your own visits are never counted) */}
        <Link
          href="/admin/analytics?range=today"
          className="rounded-xl border bg-card p-5 shadow-card transition hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-sm text-muted-foreground">{ta("tile.visitors")}</p>
          <p className="mt-2 text-2xl font-semibold">{today ? formatNumber(today.visitors) : "—"}</p>
          {today && (
            <p className="mt-1 text-xs text-muted-foreground">
              {ta("tile.hint", { live: formatNumber(today.live), leads: formatNumber(today.leads) })}
            </p>
          )}
        </Link>
      </div>

      <div className="space-y-2">
        <nav aria-label={ti("queue.tabs")} className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1 text-sm sm:w-fit">
          {(
            [
              ["review", "/admin", `${ti("queue.tab.review")} (${s.pending})`],
              ["imported", "/admin?tab=imported", `${ti("queue.tab.imported")} (${imported.length})`],
            ] as const
          ).map(([key, href, label]) => (
            <Link
              key={key}
              href={href}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === key && "bg-card text-foreground shadow-card",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {tab === "imported" && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-3xl text-sm text-muted-foreground">{ti("imported.sub")}</p>
            {sources.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...sources].map(([key, src]) => (
                  <PublishAttestedButton key={key} sourceKey={key} sourceName={src.name} count={src.count} named={sources.size > 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.listing")}</TableHead>
              <TableHead>{t("col.seller")}</TableHead>
              <TableHead>{t("col.documents")}</TableHead>
              <TableHead className="text-end">{t("col.asking")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {tab === "imported" ? ti("imported.empty") : t("queue.empty")}
                </TableCell>
              </TableRow>
            )}
            {queue.map((q) => (
              <TableRow key={q.id}>
                {/* wrap-anywhere: a typed developer (or project) name can be one word wider than the column; min-w keeps
                    the column readable once it may break anywhere. */}
                <TableCell className="min-w-56 wrap-anywhere">
                  <Link href={`/admin/listings/${q.id}`} className="font-medium hover:underline">
                    {q.projectName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <bdi>{refCode(q.refNo)}</bdi> · <bdi>{developerName(tc, q.developer, q.developerOther)}</bdi> ·{" "}
                    {tc(`unit.${q.unitType}`)} · {t("queue.submitted", { date: formatDate(q.createdAt, locale) })}
                  </p>
                  {q.source?.import && q.source.ref && (
                    <p className="text-xs text-muted-foreground">
                      {ti("imported.from", { source: q.source.sourceName ?? q.source.import, ref: q.source.ref })}
                    </p>
                  )}
                  {/* Under a placeholder owner, the Seller column says "Owner to add" instead. */}
                  {q.awaitingSeller && !q.awaitingOwner && (
                    <p className="mt-1">
                      <StatusPill tone="warning">{t("claim.pendingBadge")}</StatusPill>
                    </p>
                  )}
                  {/* "Approve" is in this row too: the warning the listing page shows, so it isn't approved unseen. */}
                  {[q.description, q.view, q.floor].some((text) => contactKinds(text).length > 0) && (
                    <p className="mt-1">
                      <Link
                        href={`/admin/listings/${q.id}#contact-warning`}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-testid="queue-contact-warning"
                      >
                        <StatusPill tone="destructive">{t("contact.badge")}</StatusPill>
                      </Link>
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {q.awaitingOwner ? (
                    <StatusPill tone="warning">{ti("owner.badge")}</StatusPill>
                  ) : (
                    <>
                      {q.sellerName}
                      <p className="text-xs text-muted-foreground">
                        <bdi dir="ltr">{q.sellerPhone ?? q.sellerEmail}</bdi>
                      </p>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 text-xs">
                    {(
                      [
                        ["spa", q.spa],
                        ["oqood", q.oqood],
                        ["soa", q.soa],
                        ["id", q.idDoc],
                      ] as const
                    ).map(([k, ok]) => (
                      <span
                        key={k}
                        className={
                          ok ? "inline-flex items-center gap-0.5 text-success" : "inline-flex items-center gap-0.5 text-destructive"
                        }
                      >
                        {ok ? <FileCheck2 className="h-3.5 w-3.5" /> : <FileX2 className="h-3.5 w-3.5" />}
                        {t(`queue.doc.${k}`)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-end tabular">{formatAED(q.askingPrice, locale)}</TableCell>
                <TableCell>
                  {q.awaitingOwner ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/listings/${q.id}#owner`}>
                        <UserPlus aria-hidden /> {ti("imported.setOwner")}
                      </Link>
                    </Button>
                  ) : (
                    <ReviewButtons listingId={q.id} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Published on the attestation and still under the placeholder: the real owner goes in from each Owner card. */}
      {tab === "imported" && publishedNoOwner.length > 0 && (
        <section aria-labelledby="published-no-owner-title" className="rounded-xl border bg-card p-5 shadow-card" data-testid="published-no-owner">
          <h2 id="published-no-owner-title" className="font-sans font-semibold">
            {publishedNoOwner.length === 1 ? ti("published.titleOne") : ti("published.title", { n: publishedNoOwner.length })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ti("published.hint")}{" "}
            <Link href="/admin/pipeline" className="font-medium underline underline-offset-4 hover:no-underline">
              {ti("published.pipeline")}
            </Link>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {publishedNoOwner.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/listings/${l.id}#owner`}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <bdi className="font-medium tabular">{refCode(l.refNo)}</bdi>
                  <ToneStatus label={tc(`listing.${l.status}`)} tone={LISTING_STATUS[l.status].tone} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted-foreground">{t("queue.tip")}</p>
      {/* Who is waiting on whom: the same items the admins' daily digest counts (src/lib/reminders.ts). */}
      <FollowUps />
    </div>
  );
}
