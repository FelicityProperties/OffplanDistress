import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { LOCALES, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { tFor } from "@/i18n/server";
import { BRAND, brandName, brokerName, type UnitTypeKey } from "./config";
import { analyzeDeal, isReady } from "./deal-math";
import { discountLabels } from "./discount-labels";
import { formatAED, formatAEDCompact, formatDate, formatQuarter, refCode } from "./format";
import { cardColumns } from "./listings";
import { advertisedSql, dubaiToday } from "./permits";
import { communityName } from "./place-names";
import { siteUrl } from "./site-url";

/** What a post needs of an advert: the card's figures plus the permit the RERA line names. */
export type PostDeal = {
  refNo: number;
  projectName: string;
  community: string;
  communityOther: string | null;
  unitType: string;
  sizeSqft: number;
  /** A bulk deal's number of units (null for a single unit). */
  lotUnits: number | null;
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  launchPrice: number | null;
  overdueAmount?: number | null;
  overduePenalty?: number | null;
  /** The developer's statement the arrears come from: the late fees are dated by it, as they grow while unpaid. */
  arrearsCheckedAt?: string | null;
  handoverDate: string | null;
  planRows: number;
  dldPermit: string | null;
  permitAttestedAt: Date | null;
};

/** One text per site language, as the copy buttons offer them. */
export type PostTexts = Record<Locale, string>;

const url = (path: string, locale: Locale) => `${siteUrl()}${localePath(path, locale)}`;

/** The RERA line an advert carries (the deal page's "Listed by" wording): its permit, or the permit our office holds. */
function reraLine(d: PostDeal, locale: Locale) {
  const td = tFor("deal", locale);
  const company = brandName(locale);
  if (d.dldPermit) return td("listedBy.permit", { permit: d.dldPermit });
  if (d.permitAttestedAt) return td("listedBy.permitHeld", { company, orn: BRAND.orn });
  return td("listedBy.office", { company, orn: BRAND.orn });
}

/** The same figures and wording as the deal card: the price to the seller, the discount chips, the handover or Ready. */
/** "price (discount)", with full-width brackets in Chinese. */
const withDiscount = (price: string, discount: string, locale: Locale) =>
  !discount ? price : locale === "zh" ? `${price}（${discount}）` : `${price} (${discount})`;

function dealLines(d: PostDeal, locale: Locale, today: string) {
  const tc = tFor("common", locale);
  const ta = tFor("admin", locale);
  const a = analyzeDeal(d);
  const chips = discountLabels(a, tc);
  const unit = tc(`unit.${d.unitType as UnitTypeKey}`);
  const where = communityName(tc, d.community, d.communityOther);
  const when = isReady(d, today) ? tc("handoverReady") : ta("wa.handover", { q: formatQuarter(d.handoverDate, locale) });
  const discount = [chips.originalIsDiscount ? chips.original : null, chips.launch].filter(Boolean).join(" · ");
  return {
    title: `${d.projectName} · ${where}`,
    facts: `${unit} · ${tc("sqft", { n: d.sizeSqft.toLocaleString("en-AE") })} · ${when}`,
    price: ta("wa.price", { price: formatAEDCompact(d.askingPrice, locale) }),
    discount,
    // What the developer wants cleared before the NOC, paid on transfer day: left out, "to the seller" and "per the
    // plan" read as the whole price of a unit in arrears. The overdue instalments are part of the price (the balance
    // owed), so the seller's line, this one and the plan's add up to it; the late fees are not, and who pays them is
    // agreed in the MOU, so they get their own line, to the dirham, next to the "below original price" claim.
    overdue: a.overdue > 0 ? ta("wa.overdue", { amount: formatAEDCompact(a.overdue, locale) }) : null,
    lateFees:
      a.penalty > 0
        ? d.arrearsCheckedAt
          ? ta("wa.lateFees", { amount: formatAED(a.penalty, locale), date: formatDate(d.arrearsCheckedAt, locale) })
          : ta("wa.lateFeesUndated", { amount: formatAED(a.penalty, locale) })
        : null,
    remaining: a.remainingAfterTransfer > 0 ? ta("wa.remaining", { amount: formatAEDCompact(a.remainingAfterTransfer, locale) }) : null,
    link: url(`/deals/${refCode(d.refNo)}`, locale),
  };
}

/** A post for one advert, to paste in a WhatsApp group: what it is, the price and discount, the link and the RERA lines. */
export function dealPost(d: PostDeal, locale: Locale, today = dubaiToday()) {
  const ta = tFor("admin", locale);
  const td = tFor("deal", locale);
  const x = dealLines(d, locale, today);
  return [
    ta("wa.headline", { ref: refCode(d.refNo) }),
    x.title,
    x.facts,
    withDiscount(x.price, x.discount, locale),
    x.overdue,
    x.remaining,
    x.lateFees,
    x.link,
    "",
    reraLine(d, locale),
    td("listedBy.broker", { name: brokerName(locale), brn: BRAND.broker.brn }),
  ]
    .filter((line) => line != null)
    .join("\n");
}

export function dealPosts(d: PostDeal, today = dubaiToday()): PostTexts {
  return Object.fromEntries(LOCALES.map((l) => [l, dealPost(d, l, today)])) as PostTexts;
}

const BEST_COUNT = 5;

/**
 * The week's best deals for a WhatsApp group: the BEST_COUNT live adverts furthest below their original price (the home
 * strip's order), each with its link and permit, then our office's RERA lines once. Null when nothing is advertised.
 */
export async function bestDealsPosts(today = dubaiToday()): Promise<PostTexts | null> {
  const saleValue = sql`(${listings.askingPrice} + greatest(${listings.originalPrice} - ${listings.amountPaid}, 0))`;
  const belowOriginal = sql`case when ${listings.originalPrice} > 0 then (${listings.originalPrice} - ${saleValue})::float / ${listings.originalPrice} end`;
  const rows = (await db
    .select({ ...cardColumns, dldPermit: listings.dldPermit, permitAttestedAt: listings.permitAttestedAt })
    .from(listings)
    .where(and(eq(listings.status, "live"), advertisedSql(today)))
    .orderBy(sql`${belowOriginal} desc nulls last`, sql`${listings.publishedAt} desc`)
    .limit(BEST_COUNT)) as PostDeal[];
  if (!rows.length) return null;
  const post = (locale: Locale) => {
    const ta = tFor("admin", locale);
    const td = tFor("deal", locale);
    const lines = rows.flatMap((d, i) => {
      const x = dealLines(d, locale, today);
      return [
        `${i + 1}. ${x.title} — ${x.facts}`,
        `   ${withDiscount(x.price, x.discount, locale)}`,
        // With overdue instalments, the plan line too, so the lines add up to the price the discount is about.
        ...[x.overdue, x.overdue ? x.remaining : null, x.lateFees].filter((line) => line != null).map((line) => `   ${line}`),
        `   ${x.link}`,
        `   ${reraLine(d, locale)}`,
      ];
    });
    return [
      ta("wa.best.headline"),
      "",
      ...lines,
      "",
      ta("wa.best.more", { url: url("/deals", locale) }),
      td("listedBy.office", { company: brandName(locale), orn: BRAND.orn }),
      td("listedBy.broker", { name: brokerName(locale), brn: BRAND.broker.brn }),
    ].join("\n");
  };
  return Object.fromEntries(LOCALES.map((l) => [l, post(l)])) as PostTexts;
}
