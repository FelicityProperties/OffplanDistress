import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { requireAdmin } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/claim";
import { CANCEL_REASONS, DEPOSIT_HOLDERS, dealsForExport, ensureAllDeals } from "@/lib/deals";
import { analyzeDeal, platformFee } from "@/lib/deal-math";
import { dubaiToday } from "@/lib/permits";
import { communityName, developerName } from "@/lib/place-names";

// GET /api/admin/export/deals.csv — every deal file (open, transferred, fell through) with both parties, for our own
// records and the Ministry of Economy's AML inspections. Admins only. Headers in the admin's language; a UTF-8 byte
// order mark so Excel reads Arabic names correctly; every text cell guarded against formula injection.

const realEmail = (email: string | null) => (email && !isPlaceholderEmail(email) ? email : null);

const dubaiDateTime = (d: Date | null) =>
  d ? new Date(d.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ") : null;

export async function GET() {
  const admin = await requireAdmin();
  const [t, tc] = await Promise.all([getT("admin"), getT("common")]);
  // Deals agreed before deal files existed get theirs now, so the export lists every deal under way.
  await ensureAllDeals();
  const rows = await dealsForExport();

  const held = (h: string | null) => ((DEPOSIT_HOLDERS as readonly string[]).includes(h ?? "") ? t(`dealFile.held.${h as (typeof DEPOSIT_HOLDERS)[number]}`) : h);
  const reason = (r: string | null) => ((CANCEL_REASONS as readonly string[]).includes(r ?? "") ? t(`dealFile.cancel.${r as (typeof CANCEL_REASONS)[number]}`) : r);

  const columns: [string, (r: (typeof rows)[number]) => string | number | null][] = [
    [t("export.col.dealId"), (r) => r.deal.id],
    [t("export.col.ref"), (r) => `OD-${1000 + r.refNo}`],
    [t("export.col.project"), (r) => r.projectName],
    [t("export.col.developer"), (r) => developerName(tc, r.developer, r.developerOther)],
    [t("export.col.community"), (r) => communityName(tc, r.community, r.communityOther)],
    [t("export.col.unitType"), (r) => tc(`unit.${r.unitType}`)],
    [t("export.col.listingStatus"), (r) => tc(`listing.${r.listingStatus}`)],
    [
      t("export.col.dealStatus"),
      (r) => t(r.deal.cancelledAt ? "export.status.cancelled" : r.listingStatus === "transferred" ? "export.status.transferred" : "export.status.open"),
    ],
    [t("export.col.sellerName"), (r) => r.sellerName],
    // A phone-only seller's account holds our own placeholder (…@claim.offplandistress.invalid), never their email.
    [t("export.col.sellerEmail"), (r) => realEmail(r.sellerEmail)],
    [t("export.col.sellerPhone"), (r) => r.sellerPhone],
    [t("export.col.sellerKyc"), (r) => (r.sellerKyc ? tc(`kyc.${r.sellerKyc}`) : null)],
    [t("export.col.buyerName"), (r) => r.buyerName],
    [t("export.col.buyerEmail"), (r) => realEmail(r.buyerEmail)],
    [t("export.col.buyerPhone"), (r) => r.buyerPhone],
    [t("export.col.buyerKyc"), (r) => (r.buyerKyc ? tc(`kyc.${r.buyerKyc}`) : null)],
    [t("export.col.spaPrice"), (r) => r.originalPrice],
    [t("export.col.amountPaid"), (r) => r.amountPaid],
    [t("export.col.askingPrice"), (r) => r.askingPrice],
    // The listing's arrears with the developer as our team last recorded them (null: not checked).
    [t("export.col.overdueAmount"), (r) => r.overdueAmount],
    [t("export.col.overduePenalty"), (r) => r.overduePenalty],
    [t("export.col.arrearsCheckedAt"), (r) => r.arrearsCheckedAt],
    [t("export.col.agreedPrice"), (r) => r.deal.agreedPrice],
    [t("export.col.saleValue"), (r) => r.deal.saleValue],
    [t("export.col.commission"), (r) => (r.deal.saleValue == null ? null : platformFee(r.deal.saleValue).commission)],
    [t("export.col.vat"), (r) => (r.deal.saleValue == null ? null : platformFee(r.deal.saleValue).vat)],
    // The deal page's "cash at transfer" at the agreed price instead of the asking price (an estimate: DLD, NOC fees).
    [
      t("export.col.cashAtTransfer"),
      (r) =>
        r.deal.agreedPrice == null
          ? null
          : analyzeDeal({
              originalPrice: r.originalPrice,
              amountPaid: r.amountPaid,
              askingPrice: r.deal.agreedPrice,
              launchPrice: null,
              overdueAmount: r.overdueAmount,
              overduePenalty: r.overduePenalty,
            }).cashToClose,
    ],
    [t("dealFile.field.depositAmount"), (r) => r.deal.depositAmount],
    [t("dealFile.field.depositHeldBy"), (r) => held(r.deal.depositHeldBy)],
    [t("dealFile.field.formANo"), (r) => r.deal.formANo],
    [t("dealFile.field.formASignedAt"), (r) => r.deal.formASignedAt],
    [t("dealFile.field.formAExpiresAt"), (r) => r.deal.formAExpiresAt],
    [t("dealFile.field.formBNo"), (r) => r.deal.formBNo],
    [t("dealFile.field.formBSignedAt"), (r) => r.deal.formBSignedAt],
    [t("dealFile.field.formFNo"), (r) => r.deal.formFNo],
    [t("dealFile.field.formFSignedAt"), (r) => r.deal.formFSignedAt],
    [t("dealFile.field.cobrokerCompany"), (r) => r.deal.cobrokerCompany],
    [t("dealFile.field.cobrokerOrn"), (r) => r.deal.cobrokerOrn],
    [t("dealFile.field.cobrokerBrn"), (r) => r.deal.cobrokerBrn],
    [t("dealFile.field.cobrokerFormINo"), (r) => r.deal.cobrokerFormINo],
    [t("dealFile.field.cobrokerSplitPct"), (r) => r.deal.cobrokerSplitPct],
    [t("dealFile.field.nocAppliedAt"), (r) => r.deal.nocAppliedAt],
    [t("dealFile.field.nocFee"), (r) => r.deal.nocFee],
    [t("dealFile.field.nocIssuedAt"), (r) => r.deal.nocIssuedAt],
    [t("dealFile.field.nocValidUntil"), (r) => r.deal.nocValidUntil],
    [t("dealFile.field.trusteeOffice"), (r) => r.deal.trusteeOffice],
    [t("dealFile.field.transferBookedFor"), (r) => r.deal.transferBookedFor],
    [t("dealFile.field.transferredAt"), (r) => r.deal.transferredAt],
    [t("dealFile.field.invoiceNo"), (r) => r.deal.invoiceNo],
    [t("dealFile.field.commissionPaidAt"), (r) => r.deal.commissionPaidAt],
    [t("export.col.cancelledAt"), (r) => dubaiDateTime(r.deal.cancelledAt)],
    [t("export.col.cancelReason"), (r) => reason(r.deal.cancelReason)],
    [t("export.col.createdAt"), (r) => dubaiDateTime(r.deal.createdAt)],
    [t("export.col.updatedAt"), (r) => dubaiDateTime(r.deal.updatedAt)],
  ];

  const csv = toCsv([columns.map(([label]) => label), ...rows.map((r) => columns.map(([, get]) => get(r)))]);
  // Personal data left the system: who exported it, and how many deals.
  await audit({ actorId: admin.id, action: "export.deals", entityType: "export", entityId: "deals.csv", diff: { rows: rows.length } });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offplandistress-deals-${dubaiToday()}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
