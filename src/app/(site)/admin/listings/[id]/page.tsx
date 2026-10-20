import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, ImageIcon } from "lucide-react";
import { AdminListingForm, ReviewButtons } from "@/components/admin/AdminControls";
import { DocumentUploader } from "@/components/DocumentUploader";
import { SellerOfferActions } from "@/components/OfferActions";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { FILE_KINDS, LISTING_STATUS, MOTIVATION, OFFER_STATUS, UNIT_TYPES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { adminListing, adminOffers } from "@/lib/admin";
import { listingFiles } from "@/lib/dashboard";
import { formatAED, formatDate, formatPct, formatQuarter, refCode, timeAgo } from "@/lib/format";

export default async function AdminListingPage({ params }: PageProps<"/admin/listings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = await adminListing(id);
  if (!row) notFound();
  const { listing: l, seller } = row;
  const [docs, offers] = await Promise.all([listingFiles(l.id), adminOffers(l.id)]);
  const a = analyzeDeal(l);

  return (
    <div className="space-y-6">
      <Link href="/admin/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pipeline
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {refCode(l.refNo)} · {l.developer} · listed {formatDate(l.createdAt)}
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{l.projectName}</h1>
          <p className="text-muted-foreground">
            {UNIT_TYPES[l.unitType]} · {l.sizeSqft.toLocaleString("en-AE")} sqft · {l.community}
            {l.floor ? ` · Floor ${l.floor}` : ""}
            {l.view ? ` · ${l.view}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ToneStatus {...LISTING_STATUS[l.status]} />
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/deals/${refCode(l.refNo)}`}>
                <ExternalLink /> Public page
              </Link>
            </Button>
            {l.status === "pending_review" && <ReviewButtons listingId={l.id} />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="font-sans font-semibold">Deal numbers</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["SPA price", formatAED(l.originalPrice)],
              ["Paid to developer", `${formatAED(l.amountPaid)} (${formatPct(a.paidPct)})`],
              ["Remaining plan", formatAED(a.remaining)],
              ["Asking (seller equity)", formatAED(l.askingPrice)],
              ["Seller discount on paid-in", formatAED(a.sellerDiscount)],
              ["Sale value", formatAED(a.saleValue)],
              ["Our fee (2% + VAT)", formatAED(a.commission + a.vat)],
              ["Launch price", l.launchPrice ? formatAED(l.launchPrice) : "Not set"],
              ["Discount vs launch", formatPct(a.discountVsLaunch, 1)],
              ["Handover", formatQuarter(l.handoverDate)],
              ["Next instalment", l.nextInstalmentDate ? `${formatAED(l.nextInstalmentAmount)} on ${formatDate(l.nextInstalmentDate)}` : "—"],
              ["Motivation", MOTIVATION[l.motivation].label],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b py-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-end font-medium tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {l.description && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{l.description}</p>}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-sans font-semibold">Seller</h2>
          <p className="mt-3 font-medium">{seller.fullName}</p>
          <p className="text-sm">
            <a href={`mailto:${seller.email}`} className="hover:underline">
              {seller.email}
            </a>
          </p>
          {seller.phone && (
            <p className="text-sm">
              <a href={`tel:${seller.phone}`} className="hover:underline">
                {seller.phone}
              </a>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">KYC: {seller.kycStatus.replace("_", " ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.watchers} buyers watching · {l.views} views</p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-lg font-semibold">Documents</h2>
          <DocumentUploader listingId={l.id} kinds={["photo", "spa", "soa", "oqood", "id", "other"]} />
        </div>
        {docs.length ? (
          <ul className="mt-4 divide-y rounded-lg border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {d.kind === "photo" ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate hover:underline">
                    {d.filename}
                  </a>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {FILE_KINDS[d.kind]} · {(d.size / 1024 / 1024).toFixed(1)} MB · {formatDate(d.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-sans text-lg font-semibold">Offers</h2>
        {offers.length ? (
          <ul className="mt-3 divide-y">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold tabular">
                    {formatAED(o.amount)}
                    {o.counterAmount && o.status === "countered" && (
                      <span className="ms-2 font-normal text-muted-foreground">countered {formatAED(o.counterAmount)}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.buyerName} · {o.buyerPhone ?? o.buyerEmail} · {o.financing} · KYC {o.buyerKyc.replace("_", " ")} ·{" "}
                    {timeAgo(o.updatedAt)}
                  </p>
                  {o.message && <p className="mt-1 text-muted-foreground">“{o.message}”</p>}
                </div>
                <div className="flex items-center gap-3">
                  <ToneStatus {...OFFER_STATUS[o.status]} />
                  <SellerOfferActions offerId={o.id} status={o.status} amount={o.amount} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No offers yet.</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-sans text-lg font-semibold">Manage listing</h2>
        <AdminListingForm
          listingId={l.id}
          status={l.status}
          verified={l.verified}
          nocEligible={l.nocEligible}
          launchPrice={l.launchPrice}
          askingPrice={l.askingPrice}
          adminNotes={l.adminNotes}
          images={l.images}
        />
      </section>
    </div>
  );
}
