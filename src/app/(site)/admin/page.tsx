import Link from "next/link";
import { FileCheck2, FileX2 } from "lucide-react";
import { DeleteSamplesButton, ReviewButtons } from "@/components/admin/AdminControls";
import { Kpi, PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { platformFee } from "@/lib/deal-math";
import { adminListings, adminStats } from "@/lib/admin";
import { formatAED, formatAEDCompact, formatDate, refCode } from "@/lib/format";

export default async function AdminQueue() {
  await requireAdmin();
  const [s, queue, t, tc, locale] = await Promise.all([
    adminStats(),
    adminListings("pending_review"),
    getT("admin"),
    getT("common"),
    getLocale(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("queue.title")} sub={t("queue.sub")}>
        <DeleteSamplesButton count={s.samples} />
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("queue.kpi.awaiting")} value={String(s.pending)} />
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
                <TableCell>
                  <Link href={`/admin/listings/${q.id}`} className="font-medium hover:underline">
                    {q.projectName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <bdi>{refCode(q.refNo)}</bdi> · {q.developer === "Other" ? tc("developer.Other") : q.developer} ·{" "}
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
