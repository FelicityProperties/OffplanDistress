import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, ExternalLink, FileText, ImageIcon } from "lucide-react";
import { DocumentUploader } from "@/components/DocumentUploader";
import { ListingActions } from "@/components/ListingActions";
import { SellerOfferActions } from "@/components/OfferActions";
import { DealMilestones } from "@/components/DealMilestones";
import { Pipeline } from "@/components/Pipeline";
import { SellerEditForm } from "@/components/SellerEditForm";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { FILE_KINDS, LISTING_STATUS, OFFER_STATUS, PUBLIC_STATUSES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { listingFiles, myListing, offersReceived } from "@/lib/dashboard";
import { sellerMilestones } from "@/lib/deals";
import { formatAED, formatDate, formatNumber, formatPct, formatQuarter, refCode, timeAgo } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("manage.metaTitle"), robots: { index: false } };
}

export default async function ManageListingPage({ params }: PageProps<"/dashboard/listings/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/listings/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = await myListing(user.id, id);
  if (!row) notFound();
  const l = row.listing;
  const [docs, allOffers, t, tc, locale, milestones] = await Promise.all([
    listingFiles(l.id),
    offersReceived(user.id),
    getT("dashboard"),
    getT("common"),
    getLocale(),
    // The deal file's dates once an offer is accepted (only dates: nothing about the buyer).
    sellerMilestones(user.id, l.id),
  ]);
  const listingOffers = allOffers.filter((o) => o.listingId === l.id);
  const a = analyzeDeal(l);
  const required: (keyof typeof FILE_KINDS)[] = ["spa", "soa", "oqood", "id"];
  const missing = required.filter((k) => !docs.some((d) => d.kind === k));
  const community = communityName(tc, l.community, l.communityOther);
  const developer = developerName(tc, l.developer, l.developerOther);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("listings.title")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Typed names (and project names) can be one word wider than a phone, or Arabic inside an English line. */}
        <div className="min-w-0 wrap-anywhere">
          <p className="text-sm text-muted-foreground">
            <bdi>{refCode(l.refNo)}</bdi> · <bdi>{developer}</bdi>
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{l.projectName}</h1>
          <p className="text-muted-foreground">
            {tc(`unit.${l.unitType}`)} · {tc("sqft", { n: formatNumber(l.sizeSqft) })} · <bdi>{community}</bdi>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ToneStatus label={tc(`listing.${l.status}`)} tone={LISTING_STATUS[l.status].tone} />
          <div className="flex gap-2">
            {PUBLIC_STATUSES.includes(l.status) && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/deals/${refCode(l.refNo)}`}>
                  <ExternalLink /> {t("manage.viewPublic")}
                </Link>
              </Button>
            )}
            <ListingActions id={l.id} status={l.status} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-card">
        <Pipeline status={l.status} />
        {milestones && <DealMilestones dates={milestones} className="mt-4" />}
        {l.status === "pending_review" && <p className="mt-4 text-sm text-muted-foreground">{t("manage.reviewNote")}</p>}
        {l.status === "rejected" && l.rejectionReason && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {l.rejectionReason}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          [t("manage.purchasePrice"), formatAED(l.originalPrice, locale)],
          [
            t("manage.paidToDeveloper"),
            t("manage.paidValue", { amount: formatAED(l.amountPaid, locale), pct: formatPct(a.paidPct) }),
          ],
          [tc("remainingPlan"), formatAED(a.remaining, locale)],
          [tc("handover"), formatQuarter(l.handoverDate, locale)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-sans text-lg font-semibold">{t("manage.offersTitle")}</h2>
        {listingOffers.length ? (
          <ul className="mt-3 divide-y">
            {listingOffers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold tabular">
                    {formatAED(o.amount, locale)}
                    {o.counterAmount && o.status === "countered" ? (
                      <span className="ms-2 font-normal text-muted-foreground">
                        {t("manage.youCountered", { amount: formatAED(o.counterAmount, locale) })}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`buyer.${o.financing}`)} · {t(o.buyerKyc === "verified" ? "kyc.verifiedTag" : o.buyerKyc === "pending" ? "kyc.pendingTag" : "kyc.notStartedTag")} ·{" "}
                    {timeAgo(o.updatedAt, locale)}
                  </p>
                  {o.message && (
                    <p className="mt-1 max-w-md text-muted-foreground" dir="auto">
                      {t("quote", { text: o.message })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ToneStatus label={tc(`offer.${o.status}`)} tone={OFFER_STATUS[o.status].tone} />
                  <SellerOfferActions offerId={o.id} status={o.status} amount={o.amount} listingStatus={l.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("manage.noOffers")}</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-lg font-semibold">{t("manage.docsTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("manage.docsSub")}</p>
          </div>
          <DocumentUploader listingId={l.id} kinds={["spa", "soa", "oqood", "id", "photo", "other"]} />
        </div>
        {missing.length > 0 && (
          <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
            {t("manage.stillNeeded", { list: missing.map((k) => tc(`file.${k}`)).join(t("listSep")) })}
          </p>
        )}
        {docs.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {d.kind === "photo" ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                  <a href={`/api/files/${d.id}`} className="truncate hover:underline" target="_blank" rel="noreferrer" dir="auto">
                    {d.filename}
                  </a>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tc(`file.${d.kind}`)} · {formatDate(d.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!["transferred", "withdrawn"].includes(l.status) && (
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-sans text-lg font-semibold">{t("manage.editTitle")}</h2>
          <SellerEditForm
            listingId={l.id}
            askingPrice={l.askingPrice}
            motivation={l.motivation}
            description={l.description}
            nextInstalmentDate={l.nextInstalmentDate}
            nextInstalmentAmount={l.nextInstalmentAmount}
          />
          <p className="mt-4 text-xs text-muted-foreground">{t("manage.editNote")}</p>
        </section>
      )}
    </div>
  );
}
