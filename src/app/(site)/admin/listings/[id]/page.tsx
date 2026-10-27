import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, ImageIcon, UserCheck } from "lucide-react";
import { AdminListingForm, ReviewButtons } from "@/components/admin/AdminControls";
import { ClaimLinkButtons } from "@/components/admin/ClaimLinkButtons";
import { FormAConfirm, OwnerForm } from "@/components/admin/OwnerCard";
import { DealFileCard } from "@/components/admin/DealFileCard";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { StatusPill } from "@/components/badges";
import { isPlaceholderEmail } from "@/lib/claim";
import { isImportOwner } from "@/lib/import";
import { emailEnabled } from "@/lib/email";
import { contactKinds } from "@/lib/typed-names";
import { DocumentUploader } from "@/components/DocumentUploader";
import { SellerOfferActions } from "@/components/OfferActions";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { LISTING_STATUS, OFFER_STATUS } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { adminListing, adminOffers, confirmedByFormA } from "@/lib/admin";
import { listingFiles } from "@/lib/dashboard";
import { formatAED, formatDate, formatNumber, formatPct, formatQuarter, refCode, timeAgo } from "@/lib/format";
import { isUuid } from "@/lib/utils";
import { dubaiToday, expiryDateBounds } from "@/lib/permits";
import { communityName, developerName } from "@/lib/place-names";

export default async function AdminListingPage({ params }: PageProps<"/admin/listings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const row = await adminListing(id);
  if (!row) notFound();
  const { listing: l, seller } = row;
  const [docs, offers, t, tc, ti, locale, viaFormA] = await Promise.all([
    listingFiles(l.id),
    adminOffers(l.id),
    getT("admin"),
    getT("common"),
    getT("intake"),
    getLocale(),
    l.createdByStaff && l.ownershipConfirmedAt ? confirmedByFormA(l.id) : false,
  ]);
  const a = analyzeDeal(l);
  // Community and developer are stored as English text; translate the known ones, keep anything else as entered.
  // A name the seller typed for "Other" is flagged, so the team knows it still needs mapping in the form below.
  const unmapped = (typed: string | null) => (typed ? ` (${tc("developer.Other")})` : "");
  // Each name in its own <bdi>: a typed Arabic name in an English line (or the reverse) keeps the separators in place.
  const community = (
    <>
      <bdi>{communityName(tc, l.community, l.communityOther)}</bdi>
      {unmapped(l.community === "Other" ? l.communityOther : null)}
    </>
  );
  const developer = (
    <>
      <bdi>{developerName(tc, l.developer, l.developerOther)}</bdi>
      {unmapped(l.developer === "Other" ? l.developerOther : null)}
    </>
  );

  // Sellers mustn't give buyers a way around the platform: flag (never strip) contact details in their text.
  // The floor too: like the view, it is free text shown on the deal page.
  const contactFound = (["description", "view", "floor"] as const).flatMap((field) =>
    contactKinds(l[field]).map((kind) => ({ field, kind })),
  );
  const awaitingSeller = l.createdByStaff && !l.ownershipConfirmedAt && !l.isSample;
  // Imported from a partner network's file (src/lib/import-format.ts): where from, for our team only.
  const imported = l.source?.import && l.source.ref ? l.source : null;
  const importSource = imported ? (imported.sourceName ?? imported.import ?? "") : "";
  // Still filed under that network's placeholder owner: the owner has to be entered before anything else.
  const placeholderOwner = isImportOwner(seller);
  const formA = docs.find((d) => d.kind === "form_a");

  return (
    <div className="space-y-6">
      <Link href="/admin/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("listing.back")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* wrap-anywhere: typed names (and project names) can be one word wider than a phone. */}
        <div className="min-w-0 wrap-anywhere">
          <p className="text-sm text-muted-foreground">
            <bdi>{refCode(l.refNo)}</bdi> · {developer} · {t("listing.listed", { date: formatDate(l.createdAt, locale) })}
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{l.projectName}</h1>
          <p className="text-muted-foreground">
            {tc(`unit.${l.unitType}`)} · {tc("sqft", { n: formatNumber(l.sizeSqft) })} · {community}
            {l.floor ? ` · ${tc("floor", { n: l.floor })}` : ""}
            {l.view && (
              <>
                {" · "}
                <bdi>{l.view}</bdi>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ToneStatus label={tc(`listing.${l.status}`)} tone={LISTING_STATUS[l.status].tone} />
          {(l.createdByStaff || contactFound.length > 0) && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {l.createdByStaff && <StatusPill tone="muted">{t("claim.staffBadge")}</StatusPill>}
              {awaitingSeller && <StatusPill tone="warning">{t("claim.pendingBadge")}</StatusPill>}
              {placeholderOwner && <StatusPill tone="warning">{ti("owner.badge")}</StatusPill>}
              {contactFound.length > 0 && (
                <a href="#contact-warning" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <StatusPill tone="destructive">{t("contact.badge")}</StatusPill>
                </a>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/deals/${refCode(l.refNo)}`}>
                <ExternalLink /> {t("listing.publicPage")}
              </Link>
            </Button>
            {l.status === "pending_review" && <ReviewButtons listingId={l.id} />}
          </div>
        </div>
      </div>

      {imported && (
        <div
          role="note"
          className="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground wrap-anywhere"
          data-testid="import-note"
        >
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
            <span>
              {imported.posted
                ? ti("note.line", { source: importSource, ref: imported.ref, date: formatDate(imported.posted, locale) })
                : ti("note.lineNoDate", { source: importSource, ref: imported.ref })}
            </span>
            {imported.url && /^https?:\/\//i.test(imported.url) && (
              <a
                href={imported.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:no-underline"
              >
                {ti("note.open", { source: importSource })} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </p>
          {imported.notes && (
            <div className="mt-2">
              <p className="text-xs font-semibold">{ti("note.notes")}</p>
              <p dir="auto" className="whitespace-pre-line text-start">
                {imported.notes}
              </p>
            </div>
          )}
          <p className="mt-2 text-xs opacity-80">{ti("note.private")}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="font-sans font-semibold">{t("listing.numbers")}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              [t("listing.spaPrice"), formatAED(l.originalPrice, locale)],
              [t("listing.paidToDeveloper"), `${formatAED(l.amountPaid, locale)} (${formatPct(a.paidPct)})`],
              [tc("remainingPlan"), formatAED(a.remaining, locale)],
              [t("listing.askingEquity"), formatAED(l.askingPrice, locale)],
              [t("listing.sellerDiscount"), formatAED(a.sellerDiscount, locale)],
              [t("listing.saleValue"), formatAED(a.saleValue, locale)],
              [t("listing.ourFee"), formatAED(a.commission + a.vat, locale)],
              [
                t("listing.arrears"),
                l.overdueAmount == null && l.overduePenalty == null
                  ? t("listing.arrearsUnknown")
                  : l.arrearsCheckedAt
                    ? t("listing.arrearsChecked", { amount: formatAED(a.arrears, locale), date: formatDate(l.arrearsCheckedAt, locale) })
                    : t("listing.arrearsSeller", { amount: formatAED(a.arrears, locale) }),
              ],
              [t("listing.cashAtTransfer"), tc("approx", { amount: formatAED(a.cashToClose, locale) })],
              [t("listing.launchPrice"), l.launchPrice ? formatAED(l.launchPrice, locale) : t("listing.notSet")],
              [t("listing.discountVsLaunch"), formatPct(a.discountVsLaunch, 1)],
              [tc("handover"), formatQuarter(l.handoverDate, locale)],
              [
                t("listing.nextInstalment"),
                l.nextInstalmentDate
                  ? t("listing.instalmentOn", {
                      amount: formatAED(l.nextInstalmentAmount, locale),
                      date: formatDate(l.nextInstalmentDate, locale),
                    })
                  : "—",
              ],
              [t("listing.motivation"), tc(`motivation.${l.motivation}`)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b py-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="shrink-0 whitespace-nowrap text-end font-medium tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {/* dir="auto": an English description stays readable (and its numbers in order) on the Arabic page. */}
          {l.description && (
            <p dir="auto" className="mt-4 whitespace-pre-line text-start text-sm text-muted-foreground">
              {l.description}
            </p>
          )}
          {contactFound.length > 0 && (
            <div
              id="contact-warning"
              role="note"
              className="mt-4 flex scroll-mt-24 items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold text-destructive">{t("contact.title")}</p>
                <ul className="mt-1 list-disc ps-5">
                  {contactFound.map(({ field, kind }) => (
                    <li key={`${field}-${kind}`}>
                      {t("contact.found", { kind: t(`contact.kind.${kind}`), field: t(`contact.field.${field}`) })}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-muted-foreground">{t("contact.body")}</p>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-sans font-semibold">{t("listing.seller")}</h2>
          <p className="mt-3 font-medium">
            {placeholderOwner && importSource ? ti("owner.placeholderName", { source: importSource }) : seller.fullName}
          </p>
          {isPlaceholderEmail(seller.email) ? (
            <p className="text-sm text-muted-foreground">{t("users.noEmail")}</p>
          ) : (
            <p className="text-sm">
              <a href={`mailto:${seller.email}`} className="hover:underline">
                <bdi dir="ltr">{seller.email}</bdi>
              </a>
            </p>
          )}
          {seller.phone && (
            <p className="text-sm">
              <a href={`tel:${seller.phone}`} className="hover:underline">
                <bdi dir="ltr">{seller.phone}</bdi>
              </a>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {t("listing.sellerKyc", { status: tc(`kyc.${seller.kycStatus}`) })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("listing.engagement", { watchers: row.watchers, views: l.views })}
          </p>
        </div>
      </div>

      {/* Who a listing our team entered is filed under, until ownership is confirmed (an import starts with nobody). */}
      {awaitingSeller && (
        <section id="owner" aria-labelledby="owner-title" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-card">
          <h2 id="owner-title" className="mb-2 font-sans text-lg font-semibold">
            {ti("owner.title")}
          </h2>
          <OwnerForm listingId={l.id} placeholder={placeholderOwner} />
        </section>
      )}

      {/* Staff-created listings: the seller confirms ownership through their claim link (or our team from the owner's
          signed Form A) before approval. */}
      {l.createdByStaff && !l.isSample && (
        <section aria-labelledby="claim-title" className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-2xl">
              <h2 id="claim-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
                <UserCheck className="h-5 w-5 shrink-0 text-gold-foreground" aria-hidden /> {t("claim.title")}
              </h2>
              {l.ownershipConfirmedAt ? (
                <p className="mt-1 text-sm text-success">
                  {viaFormA
                    ? ti("claim.confirmedFormA", { date: formatDate(l.ownershipConfirmedAt, locale) })
                    : t("claim.confirmed", { date: formatDate(l.ownershipConfirmedAt, locale) })}
                </p>
              ) : placeholderOwner ? (
                <p className="mt-1 text-sm text-muted-foreground" data-testid="set-owner-first">
                  {ti("claim.setOwnerFirst")}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">{t("claim.pending")}</p>
                  {seller.passwordHash && <p className="mt-1 text-xs text-muted-foreground">{t("claim.existingAccount")}</p>}
                </>
              )}
            </div>
            {!l.ownershipConfirmedAt &&
              (placeholderOwner ? (
                <Button asChild size="sm" variant="outline">
                  <a href="#owner">{ti("imported.setOwner")}</a>
                </Button>
              ) : (
                <ClaimLinkButtons
                  listingId={l.id}
                  sellerName={seller.fullName}
                  canEmail={!isPlaceholderEmail(seller.email) && emailEnabled()}
                />
              ))}
          </div>
          {!l.ownershipConfirmedAt && !placeholderOwner && (
            <div className="mt-4">
              <FormAConfirm listingId={l.id} fileName={formA?.filename ?? null} />
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-lg font-semibold">{t("listing.documents")}</h2>
          <DocumentUploader listingId={l.id} kinds={["photo", "spa", "soa", "oqood", "id", "form_a", "other"]} />
        </div>
        {docs.length ? (
          <ul className="mt-4 divide-y rounded-lg border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {d.kind === "photo" ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate hover:underline">
                    <bdi>{d.filename}</bdi>
                  </a>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tc(`file.${d.kind}`)} · {t("listing.fileSize", { n: (d.size / 1024 / 1024).toFixed(1) })} ·{" "}
                  {formatDate(d.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("listing.noDocs")}</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-sans text-lg font-semibold">{t("listing.offers")}</h2>
        {offers.length ? (
          <ul className="mt-3 divide-y">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold tabular">
                    {formatAED(o.amount, locale)}
                    {o.counterAmount && o.status === "countered" && (
                      <span className="ms-2 font-normal text-muted-foreground">
                        {t("listing.countered", { amount: formatAED(o.counterAmount, locale) })}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.buyerName} · <bdi dir="ltr">{o.buyerPhone ?? o.buyerEmail}</bdi> · {tc(`financing.${o.financing}`)} ·{" "}
                    {t("listing.buyerKyc", { status: tc(`kyc.${o.buyerKyc}`) })} · {timeAgo(o.updatedAt, locale)}
                  </p>
                  {o.message && <p className="mt-1 text-muted-foreground">{t("listing.quote", { text: o.message })}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <ToneStatus label={tc(`offer.${o.status}`)} tone={OFFER_STATUS[o.status].tone} />
                  <SellerOfferActions offerId={o.id} status={o.status} amount={o.amount} listingStatus={l.status} askingPrice={l.askingPrice} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("listing.noOffers")}</p>
        )}
      </section>

      {/* The deal file (contracts, NOC, transfer) once an offer is accepted; opened lazily for older deals. */}
      <DealFileCard listing={l} />

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-sans text-lg font-semibold">{t("listing.manage")}</h2>
        <AdminListingForm
          listingId={l.id}
          savedAt={l.updatedAt.toISOString()}
          status={l.status}
          verified={l.verified}
          nocEligible={l.nocEligible}
          launchPrice={l.launchPrice}
          askingPrice={l.askingPrice}
          amountPaid={l.amountPaid}
          developer={l.developer}
          developerOther={l.developerOther}
          community={l.community}
          communityOther={l.communityOther}
          adminNotes={l.adminNotes}
          dldPermit={l.dldPermit}
          dldPermitExpiresAt={l.dldPermitExpiresAt}
          dldPermitUrl={l.dldPermitUrl}
          formAExpiresAt={l.formAExpiresAt}
          expiryBounds={expiryDateBounds()}
          images={l.images}
          arrears={{
            overdueAmount: l.overdueAmount,
            overduePenalty: l.overduePenalty,
            checkedAt: l.arrearsCheckedAt,
            today: dubaiToday(),
          }}
        />
      </section>

      {/* The audit trail: who changed what on this listing, its deal file, offers and documents (admins only). */}
      <HistoryPanel listingId={l.id} />
    </div>
  );
}
