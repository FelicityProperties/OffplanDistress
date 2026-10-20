import Link from "next/link";
import { FileCheck2, FileX2 } from "lucide-react";
import { DeleteSamplesButton, ReviewButtons } from "@/components/admin/AdminControls";
import { Kpi, PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { UNIT_TYPES } from "@/lib/config";
import { platformFee } from "@/lib/deal-math";
import { adminListings, adminStats } from "@/lib/admin";
import { formatAED, formatAEDCompact, formatDate, refCode } from "@/lib/format";

export default async function AdminQueue() {
  await requireAdmin();
  const [s, queue] = await Promise.all([adminStats(), adminListings("pending_review")]);

  return (
    <div className="space-y-6">
      <PageTitle title="Verification queue" sub="Check the SPA, Oqood and statement of account with the developer, then approve.">
        <DeleteSamplesButton count={s.samples} />
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Awaiting verification" value={String(s.pending)} />
        <Kpi label="Live listings" value={String(s.live)} />
        <Kpi
          label="In NOC / transfer"
          value={String(s.inTransfer)}
          hint={s.pipelineValue ? `${formatAEDCompact(platformFee(s.pipelineValue).total)} fees in pipeline` : undefined}
        />
        <Kpi label="Fees earned (all time)" value={formatAEDCompact(platformFee(s.transferredValue).total)} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-end">Asking</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Queue clear — nothing waiting for verification.
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
                    {refCode(q.refNo)} · {q.developer} · {UNIT_TYPES[q.unitType]} · submitted {formatDate(q.createdAt)}
                  </p>
                </TableCell>
                <TableCell>
                  {q.sellerName}
                  <p className="text-xs text-muted-foreground">{q.sellerPhone ?? q.sellerEmail}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 text-xs">
                    {(
                      [
                        ["SPA", q.spa],
                        ["OQOOD", q.oqood],
                        ["SOA", q.soa],
                        ["ID", q.idDoc],
                      ] as const
                    ).map(([k, ok]) => (
                      <span
                        key={k}
                        className={
                          ok ? "inline-flex items-center gap-0.5 text-success" : "inline-flex items-center gap-0.5 text-destructive"
                        }
                      >
                        {ok ? <FileCheck2 className="h-3.5 w-3.5" /> : <FileX2 className="h-3.5 w-3.5" />}
                        {k}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-end tabular">{formatAED(q.askingPrice)}</TableCell>
                <TableCell>
                  <ReviewButtons listingId={q.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: open a listing to add the current developer launch price before approving — it powers the discount badge
        and the buyer&apos;s saving calculation.
      </p>
    </div>
  );
}
