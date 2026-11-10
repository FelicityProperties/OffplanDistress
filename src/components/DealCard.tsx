import Link from "@/components/LocaleLink";
import { BadgeCheck, BedDouble, CalendarClock, Maximize2, TrendingDown } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { DiscountBadges } from "@/components/DiscountBadges";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { analyzeDeal, isReady } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, refCode } from "@/lib/format";
import type { ListingCard } from "@/lib/listings";
import { dubaiToday } from "@/lib/permits";
import { communityName, developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

export { communityName };

/** Server Component — render it from Server Components only. */
export async function DealCard({
  deal,
  watching = false,
  layout = "grid",
  priority = false,
}: {
  deal: ListingCard;
  watching?: boolean;
  layout?: "grid" | "list";
  /** Load the photo first: for the cards visible without scrolling. */
  priority?: boolean;
}) {
  const [tc, locale] = await Promise.all([getT("common"), getLocale()]);
  const list = layout === "list";
  const href = `/deals/${refCode(deal.refNo)}`;
  const a = analyzeDeal(deal);
  const saving = a.savingVsLaunch != null && a.savingVsLaunch > 0 ? a.savingVsLaunch : null;
  const community = communityName(tc, deal.community, deal.communityOther);
  const developer = developerName(tc, deal.developer, deal.developerOther);
  // "{amount} to seller", split so the amount can be kept on one line.
  const [toSellerBefore, toSellerAfter = ""] = tc("toSeller").split("{amount}");

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card card-lift",
        // The title link stretches over the card, so its focus ring is drawn on the card (overflow would clip it).
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background",
        list && "sm:flex-row",
      )}
    >
      <div className={cn(list && "sm:w-72 sm:shrink-0")}>
        <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", list && "sm:aspect-auto sm:h-full")}>
          <DealImage
            src={deal.images[0]}
            alt={`${deal.projectName}, ${community}`}
            priority={priority}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
          <div className="absolute start-3 end-14 top-3 flex flex-wrap gap-1.5">
            <DiscountBadges a={a} tc={tc} />
            {deal.status !== "live" && <StatusPill tone="gold">{tc("underOffer")}</StatusPill>}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            {deal.isSample ? <SampleBadge /> : <span />}
            {deal.watchers > 0 && (
              <span className="rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-medium text-primary-foreground backdrop-blur tabular max-lg:text-xs">
                {tc("watching", { n: deal.watchers })}
              </span>
            )}
          </div>
        </div>
      </div>
      <WatchButton
        listingId={deal.id}
        watching={watching}
        // In list view the photo is an 18rem start column: keep the heart on its top-end corner, not over the text.
        // Below lg a 40px heart (48px target), so 0.5rem further from the column's end there.
        className={cn("absolute end-3 top-3 z-10 max-lg:h-10 max-lg:w-10", list && "sm:end-auto sm:start-[14.75rem] lg:start-[15.25rem]")}
      />
      <div className="flex flex-1 flex-col p-5">
        {/* When the developer and the chips don't fit on one line, the chips move under the name, each on one line
            (they used to squeeze to two or three lines, one character per line in Chinese). */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
          {/* truncate: a name the seller typed for "Other" can be long. */}
          <span className="min-w-0 max-w-full truncate font-semibold uppercase tracking-[0.14em]">{developer}</span>
          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            {deal.verified && !deal.isSample && (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                {tc("verified")}
              </span>
            )}
            <MotivationBadge m={deal.motivation} />
          </div>
        </div>
        <h3 className="mt-2 line-clamp-1 text-lg font-semibold leading-snug">
          {/* One link per card, stretched over it: screen readers hear every chip above as plain text. bdi: a Latin name
              on an Arabic page keeps its own order ("330 Riverside Crescent"). */}
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            <bdi>{deal.projectName}</bdi>
          </Link>
        </h3>
        <p className="truncate text-sm text-muted-foreground">{community}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {tc(`unit.${deal.unitType}`)}
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <Maximize2 className="h-3.5 w-3.5" />
            {tc("sqft", { n: deal.sizeSqft.toLocaleString("en-AE") })}
          </span>
          <span className="inline-flex items-center gap-1" data-handover>
            <CalendarClock className="h-3.5 w-3.5" />
            {isReady(deal, dubaiToday()) ? tc("handoverReady") : formatQuarter(deal.handoverDate, locale)}
          </span>
        </div>
        {/* @container: in a narrow card (a phone, the 2- and 3-column grids) both figures step down to text-lg, so
            "≈ AED 1.25M" stays on one line instead of breaking after "≈ AED". */}
        <div className="@container mt-auto grid grid-cols-2 gap-3 border-t pt-4">
          {/* Cash at transfer = equity to the seller + fees (DLD and NOC estimated) + any arrears, hence "≈". */}
          <div className="min-w-0">
            {/* Labels: 12px below lg, 11px on desktop as before. */}
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground max-lg:text-xs">
              {tc("cashAtTransfer")}
              <span className="sr-only"> ({tc("cashAtTransferSr")})</span>
            </p>
            <p className="mt-0.5 text-xl font-semibold leading-none tabular @max-[20rem]:text-lg" data-cash-at-transfer={a.cashToClose}>
              {tc("approx", { amount: formatAEDCompact(a.cashToClose, locale) })}
            </p>
            {/* Below lg the line wraps after the amount (kept whole) rather than being cut off; one line on desktop. */}
            <p className="mt-1 text-pretty text-xs text-muted-foreground tabular lg:truncate" data-to-seller={deal.askingPrice}>
              {toSellerBefore}
              <span className="whitespace-nowrap">{formatAEDCompact(deal.askingPrice, locale)}</span>
              {toSellerAfter}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground max-lg:text-xs">{tc("remainingPlan")}</p>
            {/* Overdue instalments are paid on transfer day (in the figure opposite), so they leave the plan. */}
            <p className="mt-0.5 text-xl font-semibold leading-none tabular text-foreground/80 @max-[20rem]:text-lg">
              {formatAEDCompact(a.remainingAfterTransfer, locale)}
            </p>
          </div>
        </div>
        {saving != null && (
          <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success tabular">
            <TrendingDown className="h-3.5 w-3.5" />
            {tc("saveVsNew", { amount: formatAEDCompact(saving, locale) })}
          </p>
        )}
      </div>
    </article>
  );
}
