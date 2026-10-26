import Link from "next/link";
import { BadgeCheck, BedDouble, CalendarClock, Maximize2, TrendingDown } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, refCode } from "@/lib/format";
import type { ListingCard } from "@/lib/listings";
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
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const saving = a.savingVsLaunch != null && a.savingVsLaunch > 0 ? a.savingVsLaunch : null;
  const community = communityName(tc, deal.community, deal.communityOther);
  const developer = developerName(tc, deal.developer, deal.developerOther);

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
            {discountPct != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground tabular shadow-sm">
                <TrendingDown className="h-3.5 w-3.5" />
                {tc("vsLaunch", { pct: discountPct })}
              </span>
            )}
            {deal.status !== "live" && <StatusPill tone="gold">{tc("underOffer")}</StatusPill>}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            {deal.isSample ? <SampleBadge /> : <span />}
            {deal.watchers > 0 && (
              <span className="rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-medium text-primary-foreground backdrop-blur tabular">
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
        className={cn("absolute end-3 top-3 z-10", list && "sm:end-auto sm:start-[15.25rem]")}
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {/* truncate: a name the seller typed for "Other" can be long. */}
          <span className="min-w-0 truncate font-semibold uppercase tracking-[0.14em]">{developer}</span>
          <div className="flex items-center gap-1.5">
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
          {/* One link per card, stretched over it: screen readers hear every chip above as plain text. */}
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {deal.projectName}
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
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatQuarter(deal.handoverDate, locale)}
          </span>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 border-t pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tc("upfrontToSeller")}</p>
            <p className="mt-0.5 text-xl font-semibold leading-none tabular">{formatAEDCompact(deal.askingPrice, locale)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tc("remainingPlan")}</p>
            <p className="mt-0.5 text-xl font-semibold leading-none tabular text-foreground/80">{formatAEDCompact(a.remaining, locale)}</p>
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
