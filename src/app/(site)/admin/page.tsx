import Link from "next/link";
import { CalendarClock, FileCheck2, FileX2 } from "lucide-react";
import { DeleteSamplesButton, ReviewButtons } from "@/components/admin/AdminControls";
import { Kpi, PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { platformFee } from "@/lib/deal-math";
import { adminListings, adminStats } from "@/lib/admin";
import { todaySnapshot } from "@/lib/analytics-report";
import { leadStats } from "@/lib/leads";
import { formatAED, formatAEDCompact, formatDate, formatNumber, refCode } from "@/lib/format";
import { listingsWithoutPermitExpiry } from "@/lib/permits";
import { developerName } from "@/lib/place-names";

/** Listings named in the "no permit expiry" banner; the rest are counted. */
const NO_EXPIRY_LINKS = 12;

export default async function AdminQueue() {
  await requireAdmin();
  const [s, leads, queue, t, tc, ta, today, locale] = await Promise.all([
    adminStats(),
    leadStats(),
    adminListings("pending_review"),
    getT("admin"),
    getT("common"),
    getT("analytics"),
    todaySnapshot(),
    getLocale(),
  ]);
  const noExpiry = await listingsWithoutPermitExpiry();

  return (
    <div className="space-y-6">
      <PageTitle title={t("queue.title")} sub={t("queue.sub")}>
        <DeleteSamplesButton count={s.samples} />
      </PageTitle>
      {/* Adverts that went live before permit expiry dates were recorded: the cron can't take them down on time. */}
      {noExpiry.length > 0 && (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">
              {noExpiry.length === 1 ? t("permits.noExpiry.one") : t("permits.noExpiry.many", { n: noExpiry.length })}
            </p>
            <p className="mt-1">{t("permits.noExpiry.hint")}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {noExpiry.slice(0, NO_EXPIRY_LINKS).map((l) => (
                <Link key={l.id} href={`/admin/listings/${l.id}`} className="font-medium underline underline-offset-4 hover:no-underline">
                  <bdi>{refCode(l.refNo)}</bdi>
                </Link>
              ))}
              {noExpiry.length > NO_EXPIRY_LINKS && <span>{t("permits.noExpiry.more", { n: noExpiry.length - NO_EXPIRY_LINKS })}</span>}
            </p>
          </div>
        </div>
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
        <Kpi label={t("queue.kpi.feesEarned")} value={formatAEDCompact(platformFee(s.transferredValue).total, locale)} />
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
                  {t("queue.empty")}
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
                </TableCell>
                <TableCell>
                  {q.sellerName}
                  <p className="text-xs text-muted-foreground">
                    <bdi dir="ltr">{q.sellerPhone ?? q.sellerEmail}</bdi>
                  </p>
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
                  <ReviewButtons listingId={q.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t("queue.tip")}</p>
    </div>
  );
}
