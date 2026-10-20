import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { BuyerOfferActions, SellerOfferActions } from "@/components/OfferActions";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { OFFER_STATUS } from "@/lib/config";
import { offersReceived, offersSent } from "@/lib/dashboard";
import { formatAED, formatDate, refCode } from "@/lib/format";

export default async function OffersPage({ searchParams }: PageProps<"/dashboard/offers">) {
  const user = await requireUser("/dashboard/offers");
  const { tab } = await searchParams;
  const [received, sent] = await Promise.all([offersReceived(user.id), offersSent(user.id)]);
  const defaultTab = tab === "sent" || (tab !== "received" && !received.length && sent.length) ? "sent" : "received";

  return (
    <div className="space-y-6">
      <PageTitle
        title="Offers"
        sub="Buyers stay anonymous to sellers until the NOC stage — our team brokers every negotiation."
      />
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {received.length === 0 ? (
            <EmptyState title="No offers received yet" sub="When buyers make offers on your listings they'll appear here." />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-end">Offer</TableHead>
                    <TableHead>Status</TableHead>
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
                          Asking {formatAED(o.askingPrice)} · {formatDate(o.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {o.financing === "cash" ? "Cash" : "Mortgage"}
                        <p className="text-xs">{o.buyerKyc === "verified" ? "KYC verified" : "KYC pending"}</p>
                      </TableCell>
                      <TableCell className="text-end font-semibold tabular">
                        {formatAED(o.amount)}
                        {o.status === "countered" && o.counterAmount && (
                          <p className="text-xs font-normal text-muted-foreground">Countered {formatAED(o.counterAmount)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ToneStatus {...OFFER_STATUS[o.status]} />
                      </TableCell>
                      <TableCell>
                        <SellerOfferActions offerId={o.id} status={o.status} amount={o.amount} />
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
            <EmptyState title="You haven't made any offers" sub="Find a deal you like and make an offer in two minutes.">
              <Button asChild>
                <Link href="/deals">Browse deals</Link>
              </Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-end">Your offer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sent.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/deals/${refCode(o.refNo)}`} className="font-medium hover:underline">
                          {o.projectName}
                        </Link>
                        <p className="text-xs text-muted-foreground">Asking {formatAED(o.askingPrice)}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(o.updatedAt)}</TableCell>
                      <TableCell className="text-end font-semibold tabular">
                        {formatAED(o.amount)}
                        {o.status === "countered" && o.counterAmount && (
                          <p className="text-xs font-normal text-gold-foreground">Seller countered {formatAED(o.counterAmount)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ToneStatus {...OFFER_STATUS[o.status]} />
                      </TableCell>
                      <TableCell>
                        <BuyerOfferActions offerId={o.id} status={o.status} counterAmount={o.counterAmount} />
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
