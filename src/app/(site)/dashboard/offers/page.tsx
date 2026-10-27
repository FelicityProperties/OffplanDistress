import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { BuyerOfferActions, SellerOfferActions } from "@/components/OfferActions";
import { DealMilestones } from "@/components/DealMilestones";
import { Pipeline } from "@/components/Pipeline";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="received">{t("offers.tabReceived", { count: received.length })}</TabsTrigger>
          <TabsTrigger value="sent">{t("offers.tabSent", { count: sent.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {received.length === 0 ? (
            <EmptyState title={t("offers.receivedEmptyTitle")} sub={t("offers.receivedEmptySub")} />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
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
                          askingPrice={o.askingPrice}
                          listingStatus={o.listingStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
            <div className="overflow-x-auto rounded-xl border bg-card">
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
                          counterAmount={o.counterAmount}
                          listingStatus={o.listingStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
