import "server-only";
import { and, asc, desc, eq, inArray, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, listings, newsletterIssues } from "@/db/schema";
import { dirOf, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { tFor } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { BRAND, brandAddress, brandName, brokerName, PUBLIC_STATUSES, type UnitTypeKey } from "./config";
import { analyzeDeal } from "./deal-math";
import { emailEnabled, sendEmail } from "./email";
import { formatAED, formatDate, formatQuarter, refCode } from "./format";
import { confirmedSubscribers, markSent, subscriberStats, unsubscribeApiPath, unsubscribePath } from "./newsletter";
import { advertisedSql, dubaiToday } from "./permits";
import { communityName } from "./place-names";
import { siteUrl } from "./site-url";

// The daily issue of the deals newsletter (src/lib/newsletter.ts keeps the subscribers): what changed on the market in
// a window (since, until] — adverts that went live, public prices that fell, units that left the market — rendered as
// one email in the subscriber's language and sent once a day, only on days something changed. The window starts where
// the last issue's ended, so nothing is listed twice or skipped; the newsletter_issues row for the Dubai day is written
// first (unique day), so a second run the same day sends nothing. The saved-search cron runs it at 09:00 Dubai.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Deals listed in full in one issue; the rest are "+N more on the site". */
export const MAX_NEW = 12;
export const MAX_DROPS = 8;
/** Rows read per section; a day never has this many changes, so the counts are of these. */
const LIMIT = 200;
/** Emails handed to the queue at once: each chunk goes out as one Resend batch request (src/lib/email.ts BATCH_MAX). */
const SEND_CHUNK = 100;

export type IssueDeal = {
  id: string;
  refNo: number;
  projectName: string;
  community: string;
  communityOther: string | null;
  unitType: UnitTypeKey;
  sizeSqft: number;
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  launchPrice: number | null;
  handoverDate: string | null;
  /** The first photo as an absolute address, or null when there is none the public can load. */
  image: string | null;
  dldPermit: string | null;
  /** Published on the account owner's attestation, without a permit number (src/lib/attestation.ts). */
  permitAttested: boolean;
};

export type PriceDrop = { deal: IssueDeal; from: number; to: number };

export type IssueContent = {
  since: Date;
  until: Date;
  /** Newest first. */
  newListings: IssueDeal[];
  /** Biggest drop first. */
  priceDrops: PriceDrop[];
  /** Units that left the public statuses in the window and are still off the market. */
  gone: number;
};

export type RenderedIssue = { subject: string; heading: string; html: string; text: string };

export type SendResult = {
  sent: number;
  failed: number;
  /** Confirmed subscribers at the time of the run. */
  recipients: number;
  /** "sent": the issue went out; "quiet": nothing changed, nothing sent; "already": today's issue exists; "emailOff": no sender configured. */
  reason: "sent" | "quiet" | "already" | "emailOff";
};

const dealColumns = {
  id: listings.id,
  refNo: listings.refNo,
  projectName: listings.projectName,
  community: listings.community,
  communityOther: listings.communityOther,
  unitType: listings.unitType,
  sizeSqft: listings.sizeSqft,
  originalPrice: listings.originalPrice,
  amountPaid: listings.amountPaid,
  askingPrice: listings.askingPrice,
  publicPrice: listings.publicPrice,
  launchPrice: listings.launchPrice,
  handoverDate: listings.handoverDate,
  images: listings.images,
  dldPermit: listings.dldPermit,
  permitAttestedAt: listings.permitAttestedAt,
};
type DealRow = {
  id: string;
  refNo: number;
  projectName: string;
  community: string;
  communityOther: string | null;
  unitType: UnitTypeKey;
  sizeSqft: number;
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  publicPrice: number | null;
  launchPrice: number | null;
  handoverDate: string | null;
  images: string[];
  dldPermit: string | null;
  permitAttestedAt: Date | null;
};

/** The first photo the public can load: an upload (/api/files/<id>, public for photos) or a remote https image. */
function publicImage(images: string[]) {
  const first = images[0];
  if (!first) return null;
  if (/^https:\/\//i.test(first)) return first;
  if (first.startsWith("/api/files/")) return `${siteUrl()}${first}`;
  return null;
}

function toDeal(r: DealRow): IssueDeal {
  return {
    id: r.id,
    refNo: r.refNo,
    projectName: r.projectName,
    community: r.community,
    communityOther: r.communityOther,
    unitType: r.unitType,
    sizeSqft: r.sizeSqft,
    originalPrice: r.originalPrice,
    amountPaid: r.amountPaid,
    askingPrice: r.askingPrice,
    launchPrice: r.launchPrice,
    handoverDate: r.handoverDate,
    image: publicImage(r.images),
    dldPermit: r.dldPermit,
    permitAttested: !r.dldPermit && r.permitAttestedAt != null,
  };
}

/** `column` in (since, until]. ISO strings with an explicit cast: both drivers (Neon HTTP, node-postgres) bind them alike. */
function within(column: AnyColumn, since: Date, until: Date) {
  return and(
    sql`${column} > ${since.toISOString()}::timestamptz`,
    sql`${column} <= ${until.toISOString()}::timestamptz`,
  )!;
}

const publicStatusList = sql.join(
  PUBLIC_STATUSES.map((s) => sql`${s}`),
  sql`, `,
);

/**
 * Where the next window starts: the end of the last issue that went out or had nothing to send. An issue whose every
 * send failed (email down) doesn't move it, so its changes go out with the next issue that does; one cut short while
 * sending doesn't either (some subscribers get those changes twice rather than never).
 */
async function lastWindowEnd(): Promise<Date | null> {
  const [row] = await db
    .select({ until: newsletterIssues.until })
    .from(newsletterIssues)
    .where(sql`${newsletterIssues.content}->>'state' in ('sent', 'quiet')`)
    .orderBy(desc(newsletterIssues.day))
    .limit(1);
  return row?.until ?? null;
}

/**
 * What changed in the window ending at `now`: since the last issue's end (or 24 hours before, on the first run), unless
 * `opts.since` is given (the admins' digest looks at the last 24 hours). Reads only; sendIssue records.
 */
export async function composeIssue(now = new Date(), opts: { since?: Date } = {}): Promise<IssueContent> {
  const until = now;
  const since = opts.since ?? (await lastWindowEnd()) ?? new Date(now.getTime() - DAY_MS);
  const today = dubaiToday(now);
  // Real adverts only: public status, permit and Form A current (advertisedSql); samples aren't adverts.
  const advert = and(advertisedSql(today), eq(listings.isSample, false))!;

  // New: went live in the window, newest first. A re-approval keeps the first publishedAt, so a unit is new once.
  const newRows = (await db
    .select(dealColumns)
    .from(listings)
    .where(and(advert, eq(listings.status, "live"), within(listings.publishedAt, since, until)))
    .orderBy(desc(listings.publishedAt), desc(listings.createdAt))
    .limit(LIMIT)) as DealRow[];
  const newIds = new Set(newRows.map((r) => r.id));

  // Price drops: the audit trail's publicPrice [from, to] diffs with to < from (listing.update and listing.approve
  // in src/app/actions/admin.ts, listing.sync_restored in scripts/import-partner-stock.mjs: whichever action moved
  // the public price, the diff carries it). Oldest first, so a unit cut twice keeps its first "from"; the "to" is the
  // price advertised now. A unit that went live in the window is listed as new, at its current price, not as a drop.
  const priceDiff = sql`${auditEvents.diff}->'publicPrice'`;
  const events = await db
    .select({
      listingId: auditEvents.entityId,
      from: sql<number>`round((${priceDiff}->>0)::numeric)::int`,
    })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.entityType, "listing"),
        within(auditEvents.createdAt, since, until),
        sql`jsonb_typeof(${priceDiff}->0) = 'number'`,
        sql`jsonb_typeof(${priceDiff}->1) = 'number'`,
        sql`(${priceDiff}->>1)::numeric < (${priceDiff}->>0)::numeric`,
      ),
    )
    .orderBy(asc(auditEvents.createdAt), asc(auditEvents.id))
    .limit(LIMIT * 5);
  const firstFrom = new Map<string, number>();
  for (const e of events) if (!newIds.has(e.listingId) && !firstFrom.has(e.listingId)) firstFrom.set(e.listingId, e.from);
  let priceDrops: PriceDrop[] = [];
  if (firstFrom.size) {
    const rows = (await db
      .select(dealColumns)
      .from(listings)
      .where(and(advert, inArray(listings.id, [...firstFrom.keys()])))) as DealRow[];
    priceDrops = rows
      .flatMap((r) => {
        const from = firstFrom.get(r.id)!;
        const to = r.publicPrice ?? r.askingPrice;
        return to < from ? [{ deal: toDeal(r), from, to }] : [];
      })
      // Biggest cut first, as a share of the old price.
      .sort((a, b) => (b.from - b.to) / b.from - (a.from - a.to) / a.from);
  }

  // Gone: left the public statuses in the window (the status diff of any action, the seller's withdrawal and the
  // partner sync included) and still off the market now. Adverts paused by the permit cron leave no diff, so they
  // aren't counted. Count only: the email never names a unit that isn't advertised.
  const statusDiff = sql`${auditEvents.diff}->'status'`;
  const [{ gone }] = await db
    .select({ gone: sql<number>`count(distinct ${auditEvents.entityId})::int` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.entityType, "listing"),
        within(auditEvents.createdAt, since, until),
        sql`(${statusDiff}->>0) in (${publicStatusList})`,
        sql`(${statusDiff}->>1) not in (${publicStatusList})`,
        sql`exists (select 1 from ${listings} l where l.id::text = ${auditEvents.entityId} and not l.is_sample and l.status not in (${publicStatusList}))`,
      ),
    );

  return { since, until, newListings: newRows.map(toDeal), priceDrops, gone };
}

/** The counts an issue's row and the admins' digest carry. */
export function issueCounts(c: IssueContent) {
  return { newListings: c.newListings.length, priceDrops: c.priceDrops.length, gone: c.gone };
}

// ——— Rendering ———————————————————————————————————————————————————————————————————————————————————————————————

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const plurals: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules("en"),
  ar: new Intl.PluralRules("ar"),
  zh: new Intl.PluralRules("zh"),
};

/**
 * "3 new distressed deals" / "صفقتان متعثرتان جديدتان" / "3 套新急售房源": the message form for the count. English has
 * one and other, Arabic one, two, few, many and other, Chinese only other (so its messages carry the figure); a form
 * the language's rules name but the messages don't have falls back to "other".
 */
function counted(t: TFn<"newsletter">, locale: Locale, noun: "new" | "drops" | "gone", n: number) {
  const form = plurals[locale].select(n);
  const key = `issue.${noun}.${form}` as Parameters<typeof t>[0];
  const text = form === "zero" ? key : t(key, { n });
  return text === key ? t(`issue.${noun}.other` as Parameters<typeof t>[0], { n }) : text;
}

const LINK_STYLE = "color:#141c33;font-weight:600;text-decoration:underline";
const MUTED = "color:#4a5068";

/**
 * The issue as one email in `locale`: subject with the counts, a row per deal (project · community, unit and size,
 * price to the seller with the discount vs launch when known, handover, a thumbnail when the listing has a public
 * photo, the "View deal" link and the RERA line the deal page shows), the price drops as "was X, now Y", the "gone"
 * line, and the footer with the advertiser's details and the unsubscribe link. `unsubscribeUrl` is the subscriber's
 * own; a preview gets a placeholder.
 */
export function renderIssue(content: IssueContent, locale: Locale, opts: { unsubscribeUrl?: string } = {}): RenderedIssue {
  const t = tFor("newsletter", locale);
  const tc = tFor("common", locale);
  const td = tFor("deal", locale);
  const rtl = locale === "ar";
  const base = siteUrl();
  const url = (href: string) => `${base}${localePath(href, locale)}`;
  const unsubscribeUrl = opts.unsubscribeUrl ?? `${base}${unsubscribePath("preview", locale)}`;
  // The licence details in Arabic on the Arabic issue, in their Latin form on the English and Chinese ones.
  const company = brandName(locale);
  const broker = brokerName(locale);
  const address = brandAddress(locale);
  const site = new URL(base).host;

  const n = content.newListings.length;
  const m = content.priceDrops.length;
  const newPart = n ? counted(t, locale, "new", n) : null;
  const dropPart = m ? counted(t, locale, "drops", m) : null;
  const subject =
    newPart && dropPart
      ? t("issue.subject.both", { new: newPart, drops: dropPart })
      : newPart
        ? t("issue.subject.new", { new: newPart })
        : dropPart
          ? t("issue.subject.drops", { drops: dropPart })
          : t("issue.subject.quiet");
  const heading = t("issue.heading", { date: formatDate(dubaiToday(content.until), locale) });

  // One deal: the text lines (also the plain-text version) and the HTML row built from them. In Arabic the (mostly
  // Latin) project name is bidi-isolated, so "Creek Edge 2 · مرسى خور دبي" keeps its order.
  const describe = (d: IssueDeal, price: string) => {
    const a = analyzeDeal(d);
    const pct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
    const name = rtl ? `⁨${d.projectName}⁩` : d.projectName;
    const title = `${name} · ${communityName(tc, d.community, d.communityOther)}`;
    const facts = [
      tc(`unit.${d.unitType}`),
      tc("sqft", { n: d.sizeSqft.toLocaleString("en-AE") }),
      t("issue.handover", { when: formatQuarter(d.handoverDate, locale) }),
    ].join(" · ");
    const discount = pct != null ? tc("vsLaunch", { pct }) : null;
    // The same wording as the deal page's "Listed by" block (src/app/(site)/deals/[ref]/page.tsx).
    const rera = d.dldPermit
      ? td("listedBy.permit", { permit: d.dldPermit })
      : d.permitAttested
        ? td("listedBy.permitHeld", { company, orn: BRAND.orn })
        : td("listedBy.office", { company, orn: BRAND.orn });
    return { title, facts, price, discount, rera, link: url(`/deals/${refCode(d.refNo)}`), image: d.image, name: d.projectName };
  };
  type Described = ReturnType<typeof describe>;

  const row = (x: Described) => `<tr><td style="padding:16px 0;border-top:1px solid #ebe6dc">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${
  x.image
    ? `<td width="96" valign="top" style="padding-${rtl ? "left" : "right"}:14px"><a href="${escape(x.link)}"><img src="${escape(x.image)}" width="96" height="72" alt="${escape(x.name)}" style="display:block;width:96px;height:72px;object-fit:cover;border-radius:8px;border:0"></a></td>`
    : ""
}<td valign="top" style="font-size:14px;line-height:1.5">
<p style="margin:0;font-size:15px;font-weight:600"><a href="${escape(x.link)}" style="color:#141c33;text-decoration:none">${escape(x.title)}</a></p>
<p style="margin:2px 0 0;font-size:13px;${MUTED}">${escape(x.facts)}</p>
<p style="margin:6px 0 0;font-size:14px;font-weight:600;color:#141c33">${escape(x.price)}${x.discount ? ` <span style="color:#1b7a4e">· ${escape(x.discount)}</span>` : ""}</p>
<p style="margin:8px 0 0"><a href="${escape(x.link)}" style="${LINK_STYLE}">${escape(t("issue.view"))}</a></p>
<p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#8a8fa3">${escape(x.rera)}</p>
</td></tr></table></td></tr>`;
  const textRow = (x: Described) =>
    [`- ${x.title} — ${x.facts} — ${x.price}${x.discount ? ` · ${x.discount}` : ""}`, `  ${t("issue.view")}: ${x.link}`, `  ${x.rera}`].join("\n");

  const newDeals = content.newListings.slice(0, MAX_NEW).map((d) => describe(d, t("issue.toSeller", { price: formatAED(d.askingPrice, locale) })));
  const drops = content.priceDrops
    .slice(0, MAX_DROPS)
    .map((p) => describe(p.deal, t("issue.wasNow", { from: formatAED(p.from, locale), to: formatAED(p.to, locale) })));
  const moreNew = n - newDeals.length;
  const moreDrops = m - drops.length;
  const allDealsUrl = url("/deals?sort=newest");
  const gone = content.gone ? counted(t, locale, "gone", content.gone) : null;

  const section = (title: string, rows: Described[], more: number) =>
    `<h2 style="margin:24px 0 4px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a8fa3">${escape(title)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(row).join("")}</table>
${more > 0 ? `<p style="margin:8px 0 0;font-size:14px"><a href="${escape(allDealsUrl)}" style="${LINK_STYLE}">${escape(t("issue.more", { n: more }))}</a></p>` : ""}`;
  const textSection = (title: string, rows: Described[], more: number) =>
    [title.toUpperCase(), ...rows.map(textRow), more > 0 ? `${t("issue.more", { n: more })}: ${allDealsUrl}` : null].filter(Boolean).join("\n");

  const footerLines = [
    td("listedBy.office", { company, orn: BRAND.orn }),
    td("listedBy.broker", { name: broker, brn: BRAND.broker.brn }),
    address,
  ];
  const html = `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;${MUTED}">${escape(t("issue.intro"))}</p>
${newDeals.length ? section(t("issue.new.title"), newDeals, moreNew) : ""}
${drops.length ? section(t("issue.drops.title"), drops, moreDrops) : ""}
${gone ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.6;${MUTED}">${escape(gone)}</p>` : ""}
<p style="margin:24px 0 0;font-size:14px"><a href="${escape(allDealsUrl)}" style="display:inline-block;background:#141c33;color:#faf8f3;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">${escape(t("issue.allDeals"))}</a></p>
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #ebe6dc;font-size:12px;line-height:1.6;color:#8a8fa3">${footerLines.map(escape).join("<br>")}</p>
<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#8a8fa3">${escape(t("issue.why", { site }))} <a href="${escape(unsubscribeUrl)}" style="color:#4a5068;text-decoration:underline">${escape(t("issue.unsubscribe"))}</a></p>`;

  const text = [
    heading,
    t("issue.intro"),
    newDeals.length ? textSection(t("issue.new.title"), newDeals, moreNew) : null,
    drops.length ? textSection(t("issue.drops.title"), drops, moreDrops) : null,
    gone,
    `${t("issue.allDeals")}: ${allDealsUrl}`,
    footerLines.join("\n"),
    `${t("issue.why", { site })}\n${t("issue.unsubscribeText", { url: unsubscribeUrl })}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, heading, html, text };
}

// ——— Sending ————————————————————————————————————————————————————————————————————————————————————————————————

type Subscriber = Awaited<ReturnType<typeof confirmedSubscribers>>[number];

async function sendOne(content: IssueContent, s: Subscriber) {
  const base = siteUrl();
  const rendered = renderIssue(content, s.locale, { unsubscribeUrl: `${base}${unsubscribePath(s.token, s.locale)}` });
  const { sent } = await sendEmail({
    to: s.email,
    subject: rendered.subject,
    heading: rendered.heading,
    html: rendered.html,
    text: rendered.text,
    locale: s.locale,
    dir: dirOf(s.locale),
    // RFC 8058: mail clients show their own unsubscribe button and POST to the endpoint, no page involved.
    headers: {
      "List-Unsubscribe": `<${base}${unsubscribeApiPath(s.token)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  return sent;
}

/**
 * The daily run: composes the issue for the window ending at `now`, records it for the Dubai day and, when something
 * changed, sends it to every confirmed subscriber in their language, then stores how the send went. The row goes in
 * first, so two runs the same day can't both send ("already"); a day with no new listings and no price drops is
 * recorded with nothing sent ("quiet"). Without a usable sender nothing is recorded either: the window keeps growing
 * until email is set up, and the first issue then covers it.
 */
export async function sendIssue(now = new Date()): Promise<SendResult> {
  if (!emailEnabled()) return { sent: 0, failed: 0, recipients: 0, reason: "emailOff" };
  const content = await composeIssue(now);
  const quiet = !content.newListings.length && !content.priceDrops.length;
  const record = {
    ...issueCounts(content),
    newListings: content.newListings.map((d) => d.id),
    priceDrops: content.priceDrops.map((p) => ({ id: p.deal.id, from: p.from, to: p.to })),
    recipients: 0,
    failed: 0,
    state: quiet ? "quiet" : "sending",
  };
  const [row] = await db
    .insert(newsletterIssues)
    .values({ day: dubaiToday(now), since: content.since, until: content.until, content: record })
    .onConflictDoNothing({ target: newsletterIssues.day })
    .returning({ id: newsletterIssues.id });
  if (!row) return { sent: 0, failed: 0, recipients: 0, reason: "already" };
  if (quiet) return { sent: 0, failed: 0, recipients: 0, reason: "quiet" };

  const subscribers = await confirmedSubscribers();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < subscribers.length; i += SEND_CHUNK) {
    const chunk = subscribers.slice(i, i + SEND_CHUNK);
    const results = await Promise.allSettled(chunk.map((s) => sendOne(content, s)));
    const delivered: string[] = [];
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) {
        sent++;
        delivered.push(chunk[j].id);
      } else {
        failed++;
        if (r.status === "rejected") console.error(`[newsletter] issue to subscriber ${chunk[j].id} failed`, r.reason);
      }
    });
    if (delivered.length) await markSent(delivered, now);
  }
  // Nothing went out only because every send failed: the next issue covers this window again (lastWindowEnd).
  const state = sent === 0 && failed > 0 ? "failed" : "sent";
  await db
    .update(newsletterIssues)
    .set({ sentAt: sent ? new Date() : null, content: { ...record, recipients: sent, failed, state } })
    .where(eq(newsletterIssues.id, row.id));
  return { sent, failed, recipients: subscribers.length, reason: "sent" };
}

/** What today's issue would be, rendered in `locale`, without recording anything (the admin preview and test send). */
export async function previewIssue(now = new Date(), locale: Locale) {
  const content = await composeIssue(now);
  return {
    ...renderIssue(content, locale),
    counts: issueCounts(content),
    since: content.since,
    until: content.until,
    quiet: !content.newListings.length && !content.priceDrops.length,
  };
}

/** The admins' digest line: the last 24 hours' changes and how many confirmed subscribers would get them. */
export async function inventoryDigest(now = new Date()) {
  const [content, stats] = await Promise.all([composeIssue(now, { since: new Date(now.getTime() - DAY_MS) }), subscriberStats()]);
  return { ...issueCounts(content), subscribers: stats.confirmed };
}
