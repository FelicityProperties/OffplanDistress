import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, ImageIcon, UserCheck } from "lucide-react";
import { AdminListingForm, ReviewButtons, VisibilityButtons } from "@/components/admin/AdminControls";
import { ClaimLinkButtons } from "@/components/admin/ClaimLinkButtons";
import { FormAConfirm, OwnerForm } from "@/components/admin/OwnerCard";
import { PublishAttestedListingButton } from "@/components/admin/PublishAttested";
import { DealFileCard } from "@/components/admin/DealFileCard";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { PHONE_BUTTON, PHONE_LINK } from "@/components/admin/phone";
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
import { analyzeDeal, isReady } from "@/lib/deal-math";
import { adminListing, adminOffers, confirmedByBroker, confirmedByFormA } from "@/lib/admin";
import { listingFiles } from "@/lib/dashboard";
import { formatAED, formatDate, formatNumber, formatPct, formatQuarter, refCode, timeAgo } from "@/lib/format";
import { storedFileName } from "@/lib/uploads";
import { cn, isUuid } from "@/lib/utils";
import { dubaiToday, expiryDateBounds, isAdvertised } from "@/lib/permits";
import { WhatsAppCopy } from "@/components/admin/WhatsAppCopy";
import { dealPosts } from "@/lib/whatsapp-post";
import { communityName, developerName } from "@/lib/place-names";

export default async function AdminListingPage({ params, searchParams }: PageProps<"/admin/listings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  // Opened from the verification queue (its links say so): the back link returns there, else to the pipeline.
  const from = (await searchParams).from;
  const back =
    from === "queue" || from === "imported"
      ? { href: from === "imported" ? "/admin?tab=imported" : "/admin", label: "nav.queue" as const }
      : { href: "/admin/pipeline", label: "listing.back" as const };
  if (!isUuid(id)) notFound();
  const row = await adminListing(id);
  if (!row) notFound();
  const { listing: l, seller } = row;
  const [docs, offers, t, tc, ti, locale, viaFormA, viaBroker] = await Promise.all([
    listingFiles(l.id),
    adminOffers(l.id),
    getT("admin"),
    getT("common"),
    getT("intake"),
    getLocale(),
    l.createdByStaff && l.ownershipConfirmedAt ? confirmedByFormA(l.id) : false,
    l.createdByStaff && l.ownershipConfirmedAt ? confirmedByBroker(l.id) : false,
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
  // Confirmed without its owner (their signed Form A, our record of their authority) and filed under an account that
  // can't sign in yet: the owner still needs their claim link to get in, and can still be corrected in the Owner card.
  const ownerCantSignIn =
    l.createdByStaff && !l.isSample && !placeholderOwner && !!l.ownershipConfirmedAt && !seller.passwordHash;
  // Each document under the name it is stored and served under now, also one stored before (src/lib/uploads.ts): no
  // invisible character can disguise it ("Statement<U+202E>fdp.exe" shown as a PDF).
  const shownDocs = docs.map((d) => ({ ...d, filename: storedFileName(d.filename, d.mimeType, d.kind) }));
  const formA = shownDocs.find((d) => d.kind === "form_a");

  return (
    <div className="space-y-6">
      <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground max-lg:min-h-10">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t(back.label)}
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
        {/* Phones (below sm): under the title and aligned with it, the actions across the width. */}
        <div className="flex flex-col items-end gap-2 max-sm:w-full max-sm:items-start">
          <ToneStatus label={tc(`listing.${l.status}`)} tone={LISTING_STATUS[l.status].tone} />
          {(l.createdByStaff || contactFound.length > 0) && (
            <div className="flex flex-wrap justify-end gap-1.5 max-sm:justify-start">
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
          {/* Wraps on a phone: an imported unit in review has four buttons here. */}
          <div className="flex flex-wrap justify-end gap-2 max-sm:w-full max-sm:justify-start">
            <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
              <Link href={`/deals/${refCode(l.refNo)}`}>
                <ExternalLink /> {t("listing.publicPage")}
              </Link>
            </Button>
            {l.status === "pending_review" && (
              <ReviewButtons listingId={l.id} savedAt={l.updatedAt.toISOString()} refCode={refCode(l.refNo)} project={l.projectName} />
            )}
            {!l.isSample && (
              <VisibilityButtons
                listingId={l.id}
                savedAt={l.updatedAt.toISOString()}
                status={l.status}
                pausedByAdmin={l.pausedByAdmin}
                refCode={refCode(l.refNo)}
              />
            )}
            {/* An imported unit still under its placeholder owner can't be approved; it goes live on the account owner's
                statement instead, as the whole import can from the Imported tab (src/lib/attestation.ts). */}
            {l.status === "pending_review" && placeholderOwner && l.createdByStaff && !l.isSample && !l.dldPermit && (
              <PublishAttestedListingButton listingId={l.id} savedAt={l.updatedAt.toISOString()} refCode={refCode(l.refNo)} />
            )}
          </div>
        </div>
      </div>

      {/* A ready post for the team's WhatsApp groups, in each site language: only for an advert (the post is one). */}
      {isAdvertised(l) && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <WhatsAppCopy texts={dealPosts({ ...l, planRows: (l.paymentPlan ?? []).length })} />
        </div>
      )}

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
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:no-underline max-lg:min-h-10"
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

      {/* grid-cols-1, not the implicit column: that one grows with its widest line (a phone's page with it). */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card max-sm:p-4 lg:col-span-2">
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
              // "Ready" for a unit already handed over, as on its deal page.
              [
                tc("handover"),
                isReady({ ...l, planRows: (l.paymentPlan ?? []).length }, dubaiToday())
                  ? tc("handoverReady")
                  : formatQuarter(l.handoverDate, locale),
              ],
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
              // Phones: a figure too long to share the line with its label ("AED 8,584 on 25 Nov 2026") goes under it,
              // still at the end, rather than past the card's edge.
              <div key={k} className="flex justify-between gap-3 border-b py-1.5 max-sm:flex-wrap max-sm:gap-y-0.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="shrink-0 whitespace-nowrap text-end font-medium tabular max-sm:ms-auto max-sm:min-w-0 max-sm:shrink max-sm:whitespace-normal">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {/* dir="auto": an English description stays readable (and its numbers in order) on the Arabic page.
              wrap-anywhere: a run with no space in it ("pool,gym,sauna,…") wraps instead of widening a phone's page. */}
          {l.description && (
            <p dir="auto" className="mt-4 whitespace-pre-line text-start text-sm text-muted-foreground wrap-anywhere">
              {l.description}
            </p>
          )}
          {contactFound.length > 0 && (
            <div
              id="contact-warning"
              role="note"
              className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm lg:scroll-mt-24"
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
        <div className="rounded-xl border bg-card p-5 shadow-card max-sm:p-4">
          <h2 className="font-sans font-semibold">{t("listing.seller")}</h2>
          <p className="mt-3 font-medium">
            {placeholderOwner && importSource ? ti("owner.placeholderName", { source: importSource }) : seller.fullName}
          </p>
          {isPlaceholderEmail(seller.email) ? (
            <p className="text-sm text-muted-foreground">{t("users.noEmail")}</p>
          ) : (
            <p className="text-sm">
              <a href={`mailto:${seller.email}`} className={cn("hover:underline", PHONE_LINK)}>
                <bdi dir="ltr" className="wrap-anywhere">
                  {seller.email}
                </bdi>
              </a>
            </p>
          )}
          {seller.phone && (
            <p className="text-sm">
              <a href={`tel:${seller.phone}`} className={cn("hover:underline", PHONE_LINK)}>
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

      {/* The Owner card (#owner): who a listing our team entered is filed under, open until ownership is confirmed and its
          owner can sign in (an import starts with nobody, one published on our record of the owner's authority still
          needs its owner entered, and an owner entered or confirmed without them can still be corrected until they claim
          it). Rendered closed afterwards rather than left out, so the save that closes it still says it saved. */}
      {l.createdByStaff && !l.isSample && (
        <OwnerForm listingId={l.id} placeholder={placeholderOwner} open={awaitingSeller || placeholderOwner || ownerCantSignIn} />
      )}

      {/* Staff-created listings: the seller confirms ownership through their claim link (or our team from the owner's
          signed Form A) before approval. */}
      {l.createdByStaff && !l.isSample && (
        <section aria-labelledby="claim-title" className="rounded-xl border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-2xl">
              <h2 id="claim-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
                <UserCheck className="h-5 w-5 shrink-0 text-gold-foreground" aria-hidden /> {t("claim.title")}
              </h2>
              {l.ownershipConfirmedAt ? (
                <>
                  <p className="mt-1 text-sm text-success">
                    {viaFormA
                      ? ti("claim.confirmedFormA", { date: formatDate(l.ownershipConfirmedAt, locale) })
                      : viaBroker
                        ? ti("claim.confirmedBroker", { date: formatDate(l.ownershipConfirmedAt, locale) })
                        : t("claim.confirmed", { date: formatDate(l.ownershipConfirmedAt, locale) })}
                  </p>
                  {placeholderOwner && (
                    <p className="mt-1 text-sm text-muted-foreground" data-testid="owner-still-placeholder">
                      {ti("claim.ownerStillPlaceholder")}
                    </p>
                  )}
                  {ownerCantSignIn && (
                    <p className="mt-1 text-sm text-muted-foreground" data-testid="owner-cant-sign-in">
                      {ti("claim.ownerCantSignIn")}
                    </p>
                  )}
                </>
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
            {placeholderOwner ? (
              <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
                <a href="#owner">{ti("imported.setOwner")}</a>
              </Button>
            ) : (
              (!l.ownershipConfirmedAt || ownerCantSignIn) && (
                <ClaimLinkButtons
                  listingId={l.id}
                  sellerName={seller.fullName}
                  canEmail={!isPlaceholderEmail(seller.email) && emailEnabled()}
                />
              )
            )}
          </div>
          {!l.ownershipConfirmedAt && !placeholderOwner && (
            <div className="mt-4">
              <FormAConfirm
                listingId={l.id}
                fileName={formA?.filename ?? null}
                account={seller.passwordHash ? { id: l.sellerId, name: seller.fullName, email: seller.email } : null}
              />
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-lg font-semibold">{t("listing.documents")}</h2>
          <DocumentUploader listingId={l.id} kinds={["photo", "spa", "soa", "oqood", "id", "form_a", "other"]} />
        </div>
        {shownDocs.length ? (
          <ul className="mt-4 divide-y rounded-lg border">
            {shownDocs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {d.kind === "photo" ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate hover:underline max-lg:leading-10">
                    <bdi>{d.filename}</bdi>
                  </a>
                </span>
                {/* Phones: the kind, size and date on a line of their own under the name (beside it, they ran past the card). */}
                <span className="shrink-0 text-xs text-muted-foreground max-sm:basis-full">
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

      <section className="rounded-xl border bg-card p-4 shadow-card sm:p-6">
        <h2 className="font-sans text-lg font-semibold">{t("listing.offers")}</h2>
        {offers.length ? (
          <ul className="mt-3 divide-y">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                {/* min-w-0 + wrap-anywhere: the meta line holds the buyer's e-mail, one unbreakable word. */}
                <div className="min-w-0 wrap-anywhere">
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
                {/* Phones: the status, then the answers on a line of their own when they don't fit beside it (three
                    buttons are wider than a 320 px card). */}
                <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap max-sm:justify-between max-sm:gap-2">
                  <ToneStatus label={tc(`offer.${o.status}`)} tone={OFFER_STATUS[o.status].tone} />
                  <SellerOfferActions
                    offerId={o.id}
                    status={o.status}
                    amount={o.amount}
                    updatedAt={o.updatedAt.toISOString()}
                    listingStatus={l.status}
                    askingPrice={l.askingPrice}
                  />
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

      {/* p-4 on a phone: the form's Save row spans the card (PHONE_SAVE_BAR expects it). */}
      <section className="rounded-xl border bg-card p-4 shadow-card sm:p-6">
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
          permitAttestedAt={l.permitAttestedAt?.toISOString() ?? null}
          isSample={l.isSample}
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
