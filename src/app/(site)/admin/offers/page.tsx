import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { ToneStatus } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { OFFER_STATUS } from "@/lib/config";
import { adminOffers } from "@/lib/admin";
import { formatAED, refCode, timeAgo } from "@/lib/format";

export default async function AdminOffersPage() {
  await requireAdmin();
  const [offers, t, tc, locale] = await Promise.all([adminOffers(), getT("admin"), getT("common"), getLocale()]);
  return (
    <div className="space-y-6">
      <PageTitle title={t("offers.title")} sub={t("offers.sub")} />
      {offers.length === 0 ? (
        <EmptyState title={t("offers.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.listing")}</TableHead>
                <TableHead>{t("col.buyer")}</TableHead>
                <TableHead>{t("col.seller")}</TableHead>
                <TableHead className="text-end">{t("col.offer")}</TableHead>
                <TableHead>{t("col.status")}</TableHead>
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
                      <bdi>{refCode(o.refNo)}</bdi> · {t("offers.asking", { amount: formatAED(o.askingPrice, locale) })} ·{" "}
                      {timeAgo(o.updatedAt, locale)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {o.buyerName}
                    <p className="text-xs text-muted-foreground">
                      <bdi dir="ltr">{o.buyerPhone ?? o.buyerEmail}</bdi>
                    </p>
                  </TableCell>
                  <TableCell>
                    {o.sellerName}
                    <p className="text-xs text-muted-foreground">
                      <bdi dir="ltr">{o.sellerPhone ?? o.sellerEmail}</bdi>
                    </p>
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular">
                    {formatAED(o.amount, locale)}
                    <p className="text-xs font-normal text-muted-foreground">{tc(`financing.${o.financing}`)}</p>
                  </TableCell>
                  <TableCell>
                    <ToneStatus label={tc(`offer.${o.status}`)} tone={OFFER_STATUS[o.status].tone} />
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
