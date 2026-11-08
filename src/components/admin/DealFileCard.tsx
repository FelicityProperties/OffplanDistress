import Link from "next/link";
import { CheckCircle2, Circle, Download, FolderOpen } from "lucide-react";
import { KycSelect } from "@/components/admin/AdminControls";
import { DealFileForm, DealNoteForm, type DealFileValues } from "@/components/admin/DealFile";
import { PHONE_LINK } from "@/components/admin/phone";
import { StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { isPlaceholderEmail } from "@/lib/claim";
import { CANCEL_REASONS, dealFileData, type DealFileData } from "@/lib/deals";
import { formatAED, formatDate } from "@/lib/format";
import { dubaiToday } from "@/lib/permits";
import { cn } from "@/lib/utils";

// The deal file card on the admin listing page (admins only; the page checks). Rendering it opens the file of a deal
// agreed before deal files existed, from its accepted offer (ensureDeal in src/lib/deals.ts).

type Listing = {
  id: string;
  sellerId: string;
  isSample: boolean;
  originalPrice: number;
  amountPaid: number;
  /** Arrears with the developer (src/lib/deal-math.ts): part of the buyer's cash on transfer day at the agreed price. */
  overdueAmount: number | null;
  overduePenalty: number | null;
  /** Where an imported unit came from: names its placeholder owner ("Owner to be added (…)") in the page's language. */
  source: { import?: string; sourceName?: string } | null;
};

type CheckItem = { key: TKey<"admin">; done: boolean; date?: string | null };

function checklist(d: DealFileData) {
  const { deal, buyer, seller } = d;
  const groups: { title: TKey<"admin">; gate: boolean; items: CheckItem[] }[] = [
    {
      title: "dealFile.group.noc",
      gate: true,
      items: [
        { key: "dealFile.check.formF", done: Boolean(deal.formFSignedAt), date: deal.formFSignedAt },
        { key: "dealFile.check.sellerKyc", done: seller?.kycStatus === "verified" },
        { key: "dealFile.check.buyerKyc", done: buyer?.kycStatus === "verified" },
      ],
    },
    {
      title: "dealFile.group.transfer",
      gate: true,
      items: [
        { key: "dealFile.check.agreedPrice", done: deal.agreedPrice != null },
        { key: "dealFile.check.nocIssued", done: Boolean(deal.nocIssuedAt), date: deal.nocIssuedAt },
        { key: "dealFile.check.transferred", done: Boolean(deal.transferredAt), date: deal.transferredAt },
      ],
    },
    {
      title: "dealFile.group.other",
      gate: false,
      items: [
        { key: "dealFile.check.formA", done: Boolean(deal.formASignedAt), date: deal.formASignedAt },
        { key: "dealFile.check.formB", done: Boolean(deal.formBSignedAt), date: deal.formBSignedAt },
        { key: "dealFile.check.deposit", done: deal.depositAmount != null },
        { key: "dealFile.check.nocApplied", done: Boolean(deal.nocAppliedAt), date: deal.nocAppliedAt },
        { key: "dealFile.check.transferBooked", done: Boolean(deal.transferBookedFor), date: deal.transferBookedFor },
        { key: "dealFile.check.invoice", done: Boolean(deal.invoiceNo) },
        { key: "dealFile.check.commissionPaid", done: Boolean(deal.commissionPaidAt), date: deal.commissionPaidAt },
      ],
    },
  ];
  return groups;
}

/** A moment as its Dubai calendar day (formatDate alone gives the server's UTC day: the day before until 04:00). */
const dubaiDay = (d: Date | null) => (d ? dubaiToday(d) : null);

const cancelReason = (r: string | null) => (CANCEL_REASONS as readonly string[]).includes(r ?? "") ? (r as (typeof CANCEL_REASONS)[number]) : null;

export async function DealFileCard({ listing }: { listing: Listing }) {
  const data = await dealFileData(listing);
  if (!data) return null;
  const [t, tc, ti, locale] = await Promise.all([getT("admin"), getT("common"), getT("intake"), getLocale()]);
  const { deal, buyer, seller, offer, notes, earlier } = data;
  const importSource = listing.source?.sourceName ?? listing.source?.import ?? "";
  const remaining = Math.max(listing.originalPrice - listing.amountPaid, 0);
  const values: DealFileValues = {
    agreedPrice: deal.agreedPrice,
    depositAmount: deal.depositAmount,
    depositHeldBy: deal.depositHeldBy,
    formANo: deal.formANo,
    formASignedAt: deal.formASignedAt,
    formAExpiresAt: deal.formAExpiresAt,
    formBNo: deal.formBNo,
    formBSignedAt: deal.formBSignedAt,
    formFNo: deal.formFNo,
    formFSignedAt: deal.formFSignedAt,
    cobrokerCompany: deal.cobrokerCompany,
    cobrokerOrn: deal.cobrokerOrn,
    cobrokerBrn: deal.cobrokerBrn,
    cobrokerFormINo: deal.cobrokerFormINo,
    cobrokerSplitPct: deal.cobrokerSplitPct,
    nocAppliedAt: deal.nocAppliedAt,
    nocFee: deal.nocFee,
    nocIssuedAt: deal.nocIssuedAt,
    nocValidUntil: deal.nocValidUntil,
    trusteeOffice: deal.trusteeOffice,
    transferBookedFor: deal.transferBookedFor,
    transferredAt: deal.transferredAt,
    invoiceNo: deal.invoiceNo,
    commissionPaidAt: deal.commissionPaidAt,
  };

  const partyCard = (role: "buyer" | "seller", p: DealFileData["buyer"]) => (
    <div className="min-w-0 rounded-lg border p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(role === "buyer" ? "dealFile.buyer" : "dealFile.seller")}</p>
      {p ? (
        <>
          {/* An import's placeholder owner as the listing page names it, in the page's language, without its internal
              .invalid address (as a phone-only seller's). */}
          <p className="mt-1 font-medium wrap-anywhere">
            <bdi>{p.importOwner && importSource ? ti("owner.placeholderName", { source: importSource }) : p.fullName}</bdi>
          </p>
          <p className="text-xs text-muted-foreground wrap-anywhere">
            {/* The number as a link (the pages tell iPhones not to make one themselves). */}
            {p.phone ? (
              <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className={cn("hover:underline", PHONE_LINK)}>
                <bdi dir="ltr">{p.phone}</bdi>
              </a>
            ) : isPlaceholderEmail(p.email) ? (
              t("users.noEmail")
            ) : (
              <bdi dir="ltr">{p.email}</bdi>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {/* The NOC gate checks this KYC: set here, or on Admin → Users. A placeholder is nobody, so its KYC waits for the
                real owner, entered in the Owner card. */}
            {p.importOwner ? (
              <>
                <StatusPill tone="muted">{t("dealFile.kyc", { status: tc(`kyc.${p.kycStatus}`) })}</StatusPill>
                <a href="#owner" className={cn("font-medium underline-offset-4 hover:underline", PHONE_LINK)}>
                  {ti("imported.setOwner")}
                </a>
              </>
            ) : (
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("kyc.label")}</span>
                <KycSelect userId={p.id} value={p.kycStatus} label={t(role === "buyer" ? "dealFile.kycBuyer" : "dealFile.kycSeller")} />
              </label>
            )}
            {p.kycStatus === "verified" && (
              <span className="text-muted-foreground">
                {p.kycVerifiedAt
                  ? t("dealFile.kycVerified", { date: formatDate(dubaiDay(p.kycVerifiedAt), locale), name: p.kycVerifiedBy ?? t("history.deletedAccount") })
                  : t("dealFile.kycVerifiedEarlier")}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1 text-muted-foreground">{t("dealFile.noBuyer")}</p>
      )}
    </div>
  );

  return (
    // p-4 on a phone: the form's Save row spans the card (PHONE_SAVE_BAR expects it).
    <section aria-labelledby="deal-file-title" className="rounded-xl border bg-card p-4 shadow-card sm:p-6" data-testid="deal-file">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 id="deal-file-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
            <FolderOpen className="h-5 w-5 shrink-0 text-gold-foreground" aria-hidden /> {t("dealFile.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("dealFile.sub")}</p>
          <p className="mt-1 text-sm">
            {offer
              ? t("dealFile.fromOffer", { date: formatDate(dubaiDay(offer.updatedAt), locale), amount: formatAED(offer.amount, locale) })
              : t("dealFile.noOffer")}
          </p>
        </div>
        <a
          href="/api/admin/export/deals.csv"
          download
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:min-h-10"
        >
          <Download className="h-4 w-4" aria-hidden /> {t("dealFile.export")}
        </a>
      </div>

      <h3 className="mt-5 font-sans text-sm font-semibold">{t("dealFile.parties")}</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {partyCard("seller", seller)}
        {partyCard("buyer", buyer)}
      </div>
      <p className="mt-2 text-xs">
        <Link href="/admin/users" className={cn("text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", PHONE_LINK)}>
          {t("dealFile.kycManage")}
        </Link>
      </p>

      <h3 className="mt-5 font-sans text-sm font-semibold">{t("dealFile.checklist")}</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {checklist(data).map((g) => {
          const ready = g.items.every((i) => i.done);
          return (
            <div key={g.title} className="rounded-lg border p-3" data-testid={`deal-check-${g.title}`}>
              <p className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                {t(g.title)}
                {g.gate && ready && <StatusPill tone="success">{t("dealFile.ready")}</StatusPill>}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {g.items.map((i) => (
                  <li key={i.key} className="flex items-start gap-2">
                    {i.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Circle className={cn("mt-0.5 h-4 w-4 shrink-0", g.gate ? "text-destructive" : "text-muted-foreground")} aria-hidden />
                    )}
                    <span className="min-w-0">
                      {t(i.key)}
                      <span className="sr-only"> — {t(i.done ? "dealFile.check.done" : "dealFile.check.missing")}</span>
                      {i.date && <span className="block text-xs text-muted-foreground">{formatDate(i.date, locale)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <DealFileForm
          dealId={deal.id}
          listingId={listing.id}
          updatedWas={deal.updatedAt.toISOString()}
          values={values}
          remaining={remaining}
          deal={{
            originalPrice: listing.originalPrice,
            amountPaid: listing.amountPaid,
            overdueAmount: listing.overdueAmount,
            overduePenalty: listing.overduePenalty,
          }}
          needsBuyer={!deal.buyerId}
          today={dubaiToday()}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="font-sans text-sm font-semibold">{t("dealFile.notes")}</h3>
          {notes.length ? (
            <ul className="mt-2 divide-y rounded-lg border">
              {notes.map((n) => (
                <li key={n.id} className="px-3 py-2 text-sm">
                  <p className="whitespace-pre-line wrap-anywhere" dir="auto">
                    {n.body}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("dealFile.notes.meta", { name: n.author ?? t("history.deletedAccount"), date: formatDate(dubaiDay(n.createdAt), locale) })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("dealFile.notes.empty")}</p>
          )}
        </div>
        <DealNoteForm dealId={deal.id} />
      </div>

      {earlier.length > 0 && (
        <div className="mt-6">
          <h3 className="font-sans text-sm font-semibold">{t("dealFile.earlier")}</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {earlier.map((e) => {
              const reason = cancelReason(e.cancelReason);
              return (
                <li key={e.id}>
                  {t("dealFile.earlierItem", {
                    date: formatDate(dubaiDay(e.cancelledAt), locale),
                    reason: reason ? t(`dealFile.cancel.${reason}`) : "—",
                  })}
                  {e.agreedPrice != null && <> · {formatAED(e.agreedPrice, locale)}</>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
