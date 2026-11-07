import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { BuyerOfferActions, OffersTabs, SellerOfferActions } from "@/components/OfferActions";
import { DealMilestones } from "@/components/DealMilestones";
import { Pipeline } from "@/components/Pipeline";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { LISTING_STATUS, OFFER_STATUS } from "@/lib/config";
import { offersReceived, offersSent } from "@/lib/dashboard";
import { buyerDeals } from "@/lib/deals";
import { formatAED, formatDate, refCode } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("offers.title"), robots: { index: false } };
}

/** A card's title link: its tap area is 44 px tall (the extra height overlaps only the card's padding and text). */
const CARD_LINK = "-my-2.5 inline-block py-2.5 font-medium hover:underline";

export default async function OffersPage({ searchParams }: PageProps<"/dashboard/offers">) {
  const user = await requireUser("/dashboard/offers");
  const { tab } = await searchParams;
  const [received, sent, t, tc, locale, purchases] = await Promise.all([
    offersReceived(user.id),
    offersSent(user.id),
    getT("dashboard"),
    getT("common"),
    getLocale(),
    // This buyer's accepted offers on units moving to transfer, with the deal file's dates (never the seller).
    buyerDeals(user.id),
  ]);
  const defaultTab = tab === "sent" || (tab !== "received" && !received.length && sent.length) ? "sent" : "received";
  const offerStatus = (s: keyof typeof OFFER_STATUS) => ({ label: tc(`offer.${s}`), tone: OFFER_STATUS[s].tone });

  return (
    <div className="space-y-6">
      <PageTitle title={t("offers.title")} sub={t("offers.sub")} />
      {purchases.length > 0 && (
        <section aria-labelledby="purchases-title" className="space-y-3" data-testid="buyer-deals">
          <div>
            <h2 id="purchases-title" className="font-sans text-lg font-semibold">
              {t("milestones.buyerTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("milestones.buyerSub")}</p>
          </div>
          {purchases.map((p) => (
            <div key={p.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 wrap-anywhere">
                  {/* A transferred unit is off the market: its deal page is no longer public (it would 404). */}
                  {p.status === "transferred" ? (
                    <p className="font-medium">{p.projectName}</p>
                  ) : (
                    <Link href={`/deals/${refCode(p.refNo)}`} className="font-medium hover:underline">
                      {p.projectName}
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <bdi>{refCode(p.refNo)}</bdi>
                  </p>
                </div>
                <ToneStatus label={tc(`listing.${p.status}`)} tone={LISTING_STATUS[p.status].tone} />
              </div>
              <Pipeline status={p.status} />
              <DealMilestones dates={p.milestones} />
            </div>
          ))}
        </section>
      )}
      {/* The open tab follows ?tab= as the address changes (a counter-offer notice opened on this page shows Sent). */}
      <OffersTabs initial={defaultTab}>
        {/* Phones: the two tabs share the width, 40 px tall in a 48 px bar. */}
        <TabsList className="max-lg:h-12 max-sm:w-full">
          <TabsTrigger value="received" className="max-lg:min-h-10 max-sm:flex-1">
            {t("offers.tabReceived", { count: received.length })}
          </TabsTrigger>
          <TabsTrigger value="sent" className="max-lg:min-h-10 max-sm:flex-1">
            {t("offers.tabSent", { count: sent.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {received.length === 0 ? (
            <EmptyState title={t("offers.receivedEmptyTitle")} sub={t("offers.receivedEmptySub")} />
          ) : (
            <>
              {/* Phones and small tablets: a card per offer with its answers under the figure (in the 640 px table they
                  were off the screen). The table is for md and up, as before. */}
              <ul className="space-y-3 md:hidden">
                {received.map((o) => (
                  <li key={o.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 wrap-anywhere">
                        <Link href={`/dashboard/listings/${o.listingId}`} className={CARD_LINK}>
                          {o.projectName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("asking", { amount: formatAED(o.askingPrice, locale) })} · {formatDate(o.createdAt, locale)}
                        </p>
                      </div>
                      {/* shrink-0: a two-word status (Arabic) stays on one line beside a long project name. */}
                      <span className="shrink-0">
                        <ToneStatus {...offerStatus(o.status)} />
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("offers.colOffer")}</p>
                      <p className="text-lg font-semibold tabular">{formatAED(o.amount, locale)}</p>
                      {o.status === "countered" && o.counterAmount && (
                        <p className="text-xs text-muted-foreground">
                          {t("offers.countered", { amount: formatAED(o.counterAmount, locale) })}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t(`buyer.${o.financing}`)} ·{" "}
                        {t(o.buyerKyc === "verified" ? "kyc.verifiedTag" : o.buyerKyc === "pending" ? "kyc.pendingTag" : "kyc.notStartedTag")}
                      </p>
                    </div>
                    <SellerOfferActions
                      offerId={o.id}
                      status={o.status}
                      amount={o.amount}
                      updatedAt={o.updatedAt.toISOString()}
                      askingPrice={o.askingPrice}
                      listingStatus={o.listingStatus}
                    />
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("offers.colUnit")}</TableHead>
                      <TableHead>{t("offers.colBuyer")}</TableHead>
                      <TableHead className="text-end">{t("offers.colOffer")}</TableHead>
                      <TableHead>{t("offers.colStatus")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {received.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/dashboard/listings/${o.listingId}`} className="font-medium hover:underline">
                            {o.projectName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {t("asking", { amount: formatAED(o.askingPrice, locale) })} · {formatDate(o.createdAt, locale)}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tc(`financing.${o.financing}`)}
                          <p className="text-xs">
                            {t(o.buyerKyc === "verified" ? "kyc.verifiedTag" : o.buyerKyc === "pending" ? "kyc.pendingTag" : "kyc.notStartedTag")}
                          </p>
                        </TableCell>
                        <TableCell className="text-end font-semibold tabular">
                          {formatAED(o.amount, locale)}
                          {o.status === "countered" && o.counterAmount && (
                            <p className="text-xs font-normal text-muted-foreground">
                              {t("offers.countered", { amount: formatAED(o.counterAmount, locale) })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <ToneStatus {...offerStatus(o.status)} />
                        </TableCell>
                        <TableCell>
                          <SellerOfferActions
                            offerId={o.id}
                            status={o.status}
                            amount={o.amount}
                            updatedAt={o.updatedAt.toISOString()}
                            askingPrice={o.askingPrice}
                            listingStatus={o.listingStatus}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sent.length === 0 ? (
            <EmptyState title={t("offers.sentEmptyTitle")} sub={t("offers.sentEmptySub")}>
              <Button asChild>
                <Link href="/deals">{tc("browseDeals")}</Link>
              </Button>
            </EmptyState>
          ) : (
            <>
              <ul className="space-y-3 md:hidden">
                {sent.map((o) => (
                  <li key={o.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 wrap-anywhere">
                        {/* Off the market (withdrawn, paused, back in review, permit lapsed), its deal page would 404. */}
                        {o.advertised ? (
                          <Link href={`/deals/${refCode(o.refNo)}`} className={CARD_LINK}>
                            {o.projectName}
                          </Link>
                        ) : (
                          <p className="font-medium">{o.projectName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("asking", { amount: formatAED(o.askingPrice, locale) })} · {formatDate(o.updatedAt, locale)}
                        </p>
                      </div>
                      {/* shrink-0: a two-word status (Arabic) stays on one line beside a long project name. */}
                      <span className="shrink-0">
                        <ToneStatus {...offerStatus(o.status)} />
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("offers.colYourOffer")}</p>
                      <p className="text-lg font-semibold tabular">{formatAED(o.amount, locale)}</p>
                      {o.status === "countered" && o.counterAmount && (
                        <p className="text-xs font-medium text-gold-foreground">
                          {t("offers.sellerCountered", { amount: formatAED(o.counterAmount, locale) })}
                        </p>
                      )}
                    </div>
                    <BuyerOfferActions
                      offerId={o.id}
                      status={o.status}
                      amount={o.amount}
                      counterAmount={o.counterAmount}
                      updatedAt={o.updatedAt.toISOString()}
                      listingStatus={o.listingStatus}
                    />
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("offers.colUnit")}</TableHead>
                      <TableHead>{t("offers.colDate")}</TableHead>
                      <TableHead className="text-end">{t("offers.colYourOffer")}</TableHead>
                      <TableHead>{t("offers.colStatus")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sent.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          {/* Off the market (withdrawn, paused, back in review, permit lapsed), its deal page would 404. */}
                          {o.advertised ? (
                            <Link href={`/deals/${refCode(o.refNo)}`} className="font-medium hover:underline">
                              {o.projectName}
                            </Link>
                          ) : (
                            <p className="font-medium">{o.projectName}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t("asking", { amount: formatAED(o.askingPrice, locale) })}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.updatedAt, locale)}</TableCell>
                        <TableCell className="text-end font-semibold tabular">
                          {formatAED(o.amount, locale)}
                          {o.status === "countered" && o.counterAmount && (
                            <p className="text-xs font-normal text-gold-foreground">
                              {t("offers.sellerCountered", { amount: formatAED(o.counterAmount, locale) })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <ToneStatus {...offerStatus(o.status)} />
                        </TableCell>
                        <TableCell>
                          <BuyerOfferActions
                            offerId={o.id}
                            status={o.status}
                            amount={o.amount}
                            counterAmount={o.counterAmount}
                            updatedAt={o.updatedAt.toISOString()}
                            listingStatus={o.listingStatus}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </OffersTabs>
    </div>
  );
}
