import Link from "next/link";
import { AdminChips } from "@/components/admin/AdminTabs";
import { PHONE_LINK } from "@/components/admin/phone";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { ToneStatus } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/claim";
import { OFFER_STATUS } from "@/lib/config";
import { adminOffers } from "@/lib/admin";
import { formatAED, refCode, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type OfferStatus = keyof typeof OFFER_STATUS;
/** The status filter's order: the offers waiting on someone first. */
const STATUSES: OfferStatus[] = ["pending", "countered", "accepted", "declined", "withdrawn"];
/** A column's name above its value on a card (phones: the table's header row is hidden there). */
const CARD_LABEL = "text-xs font-medium text-muted-foreground md:hidden";
/** A person's number or address: under the name in the table, beside it on a card (under it when the name is long). */
const CARD_CONTACT = "text-xs text-muted-foreground max-md:ms-2 max-md:inline";

/** A buyer's or seller's number (one tap calls it) or address, as the table has always shown it. */
function Contact({ phone, email }: { phone: string | null; email: string }) {
  return (
    <a href={phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : `mailto:${email}`} className={cn("hover:underline", PHONE_LINK)}>
      <bdi dir="ltr" className={phone ? "whitespace-nowrap" : "wrap-anywhere"}>
        {phone ?? email}
      </bdi>
    </a>
  );
}

// Typed by hand (not PageProps<"/admin/offers">) so it compiles before Next regenerates its route types.
export default async function AdminOffersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [all, t, tc, ti, locale, sp] = await Promise.all([adminOffers(), getT("admin"), getT("common"), getT("intake"), getLocale(), searchParams]);
  // ?status=pending and the like: one status (the chips below the title), else every offer.
  const status = STATUSES.find((s) => s === sp.status) ?? null;
  const offers = status ? all.filter((o) => o.status === status) : all;
  const count = (s: OfferStatus) => all.filter((o) => o.status === s).length;
  return (
    <div className="space-y-6">
      <PageTitle title={t("offers.title")} sub={t("offers.sub")} />
      {all.length > 0 && (
        <AdminChips
          label={t("offers.filter")}
          current={status ?? "all"}
          chips={[
            { key: "all", href: "/admin/offers", label: t("offers.all"), count: all.length },
            ...STATUSES.filter((s) => s === status || count(s) > 0).map((s) => ({
              key: s,
              href: `/admin/offers?status=${s}`,
              label: tc(`offer.${s}`),
              count: count(s),
            })),
          ]}
        />
      )}
      {offers.length === 0 ? (
        <EmptyState title={t("offers.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          {/* Phones (below md): each row is a card, the header row hidden: the listing with the status beside it, the
              amount, then buyer and seller; from md, the table. The amount and status were off-screen on a phone. */}
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{t("col.listing")}</TableHead>
                <TableHead>{t("col.buyer")}</TableHead>
                <TableHead>{t("col.seller")}</TableHead>
                <TableHead className="text-end">{t("col.offer")}</TableHead>
                <TableHead>{t("col.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {offers.map((o) => (
                <TableRow
                  key={o.id}
                  className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-2 max-md:p-4"
                >
                  <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:p-0">
                    <Link href={`/admin/listings/${o.listingId}`} className="font-medium hover:underline max-md:text-base max-md:font-semibold">
                      {o.projectName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <bdi>{refCode(o.refNo)}</bdi> · {t("offers.asking", { amount: formatAED(o.askingPrice, locale) })} ·{" "}
                      {timeAgo(o.updatedAt, locale)}
                    </p>
                  </TableCell>
                  <TableCell className="max-md:col-span-2 max-md:row-start-3 max-md:p-0">
                    <p className={CARD_LABEL}>{t("col.buyer")}</p>
                    {o.buyerName}
                    <p className={CARD_CONTACT}>
                      <Contact phone={o.buyerPhone} email={o.buyerEmail} />
                    </p>
                  </TableCell>
                  {/* An import's placeholder owner as the listing page names it; our own .invalid addresses (it, a
                      phone-only seller) are never shown as a contact. */}
                  <TableCell className="max-md:col-span-2 max-md:row-start-4 max-md:p-0">
                    <p className={CARD_LABEL}>{t("col.seller")}</p>
                    {o.sellerPlaceholder && o.importSource ? ti("owner.placeholderName", { source: o.importSource }) : o.sellerName}
                    <p className={CARD_CONTACT}>
                      {o.sellerPhone || !isPlaceholderEmail(o.sellerEmail) ? (
                        <Contact phone={o.sellerPhone} email={o.sellerEmail} />
                      ) : (
                        t("users.noEmail")
                      )}
                    </p>
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular max-md:col-span-2 max-md:row-start-2 max-md:p-0 max-md:text-start max-md:text-lg">
                    {formatAED(o.amount, locale)}
                    <p className="text-xs font-normal text-muted-foreground">{tc(`financing.${o.financing}`)}</p>
                  </TableCell>
                  <TableCell className="max-md:col-start-2 max-md:row-start-1 max-md:self-start max-md:p-0">
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
