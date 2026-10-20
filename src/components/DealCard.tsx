import Link from "next/link";
import { BadgeCheck, BedDouble, CalendarClock, Maximize2 } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import type { TFn, TKey } from "@/i18n/translator";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, refCode } from "@/lib/format";
import type { ListingCard } from "@/lib/listings";
import { cn } from "@/lib/utils";

/** Arabic/English community name; unknown names are shown as entered. */
function communityName(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

/** Server Component — render it from Server Components only. */
export async function DealCard({
  deal,
  watching = false,
  layout = "grid",
}: {
  deal: ListingCard;
  watching?: boolean;
  layout?: "grid" | "list";
}) {
  const [tc, locale] = await Promise.all([getT("common"), getLocale()]);
  const list = layout === "list";
  const href = `/deals/${refCode(deal.refNo)}`;
  const a = analyzeDeal(deal);
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const community = communityName(tc, deal.community);
  const developer = deal.developer === "Other" ? tc("developer.Other") : deal.developer;

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border bg-card shadow-card card-lift", list && "sm:flex")}>
      <Link href={href} className={cn("block", list && "sm:w-72 sm:shrink-0")}>
        <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", list && "sm:aspect-auto sm:h-full")}>
          <DealImage
            src={deal.images[0]}
            alt={`${deal.projectName}, ${community}`}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute start-3 end-14 top-3 flex flex-wrap gap-1.5">
            {discountPct != null && (
              <span className="rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground tabular shadow-sm">
                {tc("vsLaunch", { pct: discountPct })}
              </span>
            )}
            {deal.status !== "live" && <StatusPill tone="gold">{tc("underOffer")}</StatusPill>}
          </div>
          {deal.isSample && <SampleBadge className="absolute bottom-3 start-3" />}
        </div>
      </Link>
      <WatchButton listingId={deal.id} watching={watching} className="absolute end-3 top-3" />
      <Link href={href} className="block flex-1 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{developer}</span>
          <div className="flex items-center gap-1.5">
            {deal.verified && (
              <span className="inline-flex items-center gap-1 text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                {tc("verified")}
              </span>
            )}
            <MotivationBadge m={deal.motivation} />
          </div>
        </div>
        <h3 className="mt-1.5 line-clamp-1 font-sans text-base font-semibold">{deal.projectName}</h3>
        <p className="text-sm text-muted-foreground">{community}</p>
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
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tc("upfrontToSeller")}</p>
            <p className="font-semibold tabular">{formatAEDCompact(deal.askingPrice, locale)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tc("remainingPlan")}</p>
            <p className="font-semibold tabular">{formatAEDCompact(a.remaining, locale)}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
