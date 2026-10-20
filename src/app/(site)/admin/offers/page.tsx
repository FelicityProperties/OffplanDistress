import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { ToneStatus } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { OFFER_STATUS } from "@/lib/config";
import { adminOffers } from "@/lib/admin";
import { formatAED, refCode, timeAgo } from "@/lib/format";

export default async function AdminOffersPage() {
  await requireAdmin();
  const offers = await adminOffers();
  return (
    <div className="space-y-6">
      <PageTitle title="Offers" sub="Every offer on the platform with both parties' contact details." />
      {offers.length === 0 ? (
        <EmptyState title="No offers yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-end">Offer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/listings/${o.listingId}`} className="font-medium hover:underline">
                      {o.projectName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {refCode(o.refNo)} · asking {formatAED(o.askingPrice)} · {timeAgo(o.updatedAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {o.buyerName}
                    <p className="text-xs text-muted-foreground">{o.buyerPhone ?? o.buyerEmail}</p>
                  </TableCell>
                  <TableCell>
                    {o.sellerName}
                    <p className="text-xs text-muted-foreground">{o.sellerPhone ?? o.sellerEmail}</p>
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular">
                    {formatAED(o.amount)}
                    <p className="text-xs font-normal text-muted-foreground">{o.financing}</p>
                  </TableCell>
                  <TableCell>
                    <ToneStatus {...OFFER_STATUS[o.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
