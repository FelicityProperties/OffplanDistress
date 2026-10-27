import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import type { Source } from "@/db/schema";
import { sanitizeSource } from "@/lib/attribution";

// Numbers behind /admin/analytics, read from page_views (src/lib/analytics.ts) and the lead tables. Dubai days
// (UTC+4 all year). Definitions, also explained on the page:
// - visitors: distinct visitor ids per Dubai day, added up over the range (the id changes daily by design);
// - session: one browser tab's visit, ended by 30 minutes without a page view;
// - engaged time: time the pages were visible; bounce: a session with one page view seen for under 10 seconds;
// - leads: seller estimate requests + enquiries + new accounts + new listings + offers, each counted, created in the
//   range (sample listings and anything by an admin left out); conversion = leads / visitors.

export const RANGES = ["today", "7d", "30d", "90d"] as const;
export type RangeKey = (typeof RANGES)[number];
const RANGE_DAYS: Record<RangeKey, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DUBAI_OFFSET = 4 * HOUR;
/** A session with a single page view seen for less than this is a bounce. */
export const BOUNCE_MS = 10_000;
/** "Right now": sessions with a page view in the last this-many minutes. */
export const LIVE_MINUTES = 5;

export function isRange(v: unknown): v is RangeKey {
  return typeof v === "string" && (RANGES as readonly string[]).includes(v);
}

export type Bucket = { key: string; start: Date };
export type Period = { from: Date; to: Date };

/**
 * The selected range (from the start of the first Dubai day to now), the comparison period (the same number of Dubai
 * days just before, up to the same time of day: today until 14:30 against yesterday until 14:30, never against
 * yesterday evening), and the chart's buckets: hours for today, Dubai days otherwise.
 */
export function rangeBounds(range: RangeKey, now = new Date()) {
  const todayStart = Math.floor((now.getTime() + DUBAI_OFFSET) / DAY) * DAY - DUBAI_OFFSET;
  const from = new Date(todayStart - (RANGE_DAYS[range] - 1) * DAY);
  const shift = RANGE_DAYS[range] * DAY;
  const hourly = range === "today";
  const step = hourly ? HOUR : DAY;
  const buckets: Bucket[] = [];
  for (let t = from.getTime(); t <= now.getTime(); t += step) {
    const d = new Date(t + DUBAI_OFFSET).toISOString();
    buckets.push({ key: hourly ? d.slice(0, 13) : d.slice(0, 10), start: new Date(t) });
  }
  return {
    current: { from, to: now } as Period,
    previous: { from: new Date(from.getTime() - shift), to: new Date(now.getTime() - shift) } as Period,
    hourly,
    buckets,
  };
}

const at = (d: Date) => sql`${d.toISOString()}::timestamptz`;
const viewsIn = (p: Period) => sql`select * from page_views where created_at >= ${at(p.from)} and created_at < ${at(p.to)}`;

/**
 * Every lead created in the period, one row each: kind, id, when, attribution, and what the list shows. Sample
 * listings, records made by admins and listings imported from a partner network's file (their source holds where they
 * came from, not a visit) are left out, and so is what our team enters in the console: listings entered from a seller's
 * documents (created_by_staff) and the accounts made for them, for an import's owner or for a buyer added to a deal
 * file. A "signup" is an account its owner made: the sign-up form always sets a password, while the accounts our team
 * makes have none until their owner claims one (the claim's audit row says it was a new account) or, for a deal-file
 * buyer (audited as user.create), sets one with "Forgot password".
 */
const leadsIn = (p: Period) => sql`
  select * from (
    select 'seller' as kind, sl.id::text as id, sl.created_at, sl.source, sl.name as label, sl.ref_no as ref_no, null::text as link_id
      from seller_leads sl
    union all
    select 'inquiry', i.id::text, i.created_at, i.source, i.name, l.ref_no, i.listing_id::text
      from inquiries i left join users u on u.id = i.user_id left join listings l on l.id = i.listing_id
      where u.role is distinct from 'admin'
    union all
    select 'signup', u.id::text, u.created_at, u.source, u.full_name, null, u.id::text
      from users u where u.role = 'user' and u.password_hash is not null
        and not exists (select 1 from audit_events a where a.actor_id = u.id and a.action = 'listing.claimed'
                          and a.diff->>'newAccount' = 'true')
        and not exists (select 1 from audit_events a where a.entity_type = 'user' and a.entity_id = u.id::text
                          and a.action = 'user.create')
    union all
    select 'listing', l.id::text, l.created_at, l.source, l.project_name, l.ref_no, l.id::text
      from listings l join users u on u.id = l.seller_id
      where not l.is_sample and not l.created_by_staff and u.role <> 'admin' and l.source->>'import' is null
    union all
    select 'offer', o.id::text, o.created_at, u.source, l.project_name, l.ref_no, o.listing_id::text
      from offers o join users u on u.id = o.buyer_id join listings l on l.id = o.listing_id
      where u.role <> 'admin' and not l.is_sample
  ) x where created_at >= ${at(p.from)} and created_at < ${at(p.to)}`;

export const LEAD_KINDS = ["seller", "inquiry", "signup", "listing", "offer"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const CHANNELS = ["google", "whatsapp", "instagram", "facebook", "linkedin", "tiktok", "other", "direct"] as const;
export type Channel = (typeof CHANNELS)[number];

// Referring hosts (sites and the Android apps that open links) and utm_source values, per channel.
const HOST_RE: [Channel, string][] = [
  ["google", String.raw`(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$`],
  ["whatsapp", String.raw`(^|\.)(whatsapp\.(com|net)|wa\.me)$|^com\.whatsapp(\.w4b)?$`],
  ["instagram", String.raw`(^|\.)instagram\.com$|^com\.instagram\.android$`],
  ["facebook", String.raw`(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$|^com\.facebook\.(katana|orca|lite)$`],
  ["linkedin", String.raw`(^|\.)(linkedin\.com|lnkd\.in)$|^com\.linkedin\.android$`],
  ["tiktok", String.raw`(^|\.)tiktok\.com$|^com\.zhiliaoapp\.musically$|^com\.ss\.android\.ugc`],
];
const UTM_RE: [Channel, string][] = [
  ["google", String.raw`^(google|adwords|gads|googleads)([_ -]|$)`],
  ["whatsapp", String.raw`^(whatsapp|wa)([_ -]|$)`],
  ["instagram", String.raw`^(instagram|ig)([_ -]|$)`],
  ["facebook", String.raw`^(facebook|fb|meta)([_ -]|$)`],
  ["linkedin", String.raw`^linkedin([_ -]|$)`],
  ["tiktok", String.raw`^tiktok([_ -]|$)`],
];

/**
 * The channel a visit came through: its referring site when there is one, else a recognised utm_source (apps such as
 * WhatsApp often open links without a referrer); another site or an unrecognised campaign is "other", neither "direct".
 */
function channelSql(host: SQL, utm: SQL) {
  const pick = (col: SQL, list: [Channel, string][]) =>
    sql.join(
      list.map(([ch, re]) => sql`when ${col} ~* ${re} then ${ch}`),
      sql` `,
    );
  return sql`(case
    when coalesce(${host}, '') <> '' then (case ${pick(host, HOST_RE)} else 'other' end)
    when coalesce(${utm}, '') <> '' then (case ${pick(utm, UTM_RE)} else 'other' end)
    else 'direct' end)`;
}

/** Sessions in the period: first page (entry), its attribution, page count, engaged time. */
const sessionsIn = (p: Period) => sql`
  v as (${viewsIn(p)}),
  e as (
    select distinct on (session_id) session_id, visitor_hash, path, referrer_host, utm_source, utm_campaign, ref
    from v order by session_id, created_at, id
  ),
  s as (
    select session_id, count(*)::int as n, coalesce(sum(duration_ms), 0)::float8 as ms, coalesce(max(duration_ms), 0) as mx
    from v group by session_id
  )`;

export type Headline = {
  visitors: number;
  sessions: number;
  views: number;
  avgSessionMs: number;
  bounceRate: number | null;
  leads: number;
  conversion: number | null;
  /** When visit statistics started inside this period: conversion only counts the leads from then on. */
  conversionSince: Date | null;
  leadsByKind: Record<LeadKind, number>;
};

/** When the first page view was recorded (visit statistics started), or null before any. */
async function trackingStart(): Promise<Date | null> {
  const { rows } = await db.execute<{ ms: number | null }>(
    sql`select (extract(epoch from min(created_at)) * 1000)::float8 as ms from page_views`,
  );
  return rows[0]?.ms == null ? null : new Date(Number(rows[0].ms));
}

async function headline(p: Period, start: Date | null): Promise<Headline> {
  // Leads from before visit statistics existed have no visitors to divide by: leave them out of the conversion.
  const since = start && start > p.from && start < p.to ? start : null;
  const [{ rows: [h] }, { rows: kinds }, sinceLeads] = await Promise.all([
    db.execute<{ visitors: number; sessions: number; views: number; avg_ms: number; bounces: number }>(sql`
      with ${sessionsIn(p)}
      select
        (select count(distinct visitor_hash) from v)::int as visitors,
        (select count(*) from s)::int as sessions,
        (select count(*) from v)::int as views,
        (select coalesce(avg(ms), 0) from s)::float8 as avg_ms,
        (select count(*) from s where n = 1 and mx < ${BOUNCE_MS})::int as bounces`),
    db.execute<{ kind: LeadKind; n: number }>(sql`select kind, count(*)::int as n from (${leadsIn(p)}) l group by kind`),
    since
      ? db
          .execute<{ n: number }>(sql`select count(*)::int as n from (${leadsIn({ from: since, to: p.to })}) l`)
          .then((r) => Number(r.rows[0].n))
      : null,
  ]);
  const leadsByKind = Object.fromEntries(LEAD_KINDS.map((k) => [k, 0])) as Record<LeadKind, number>;
  for (const k of kinds) leadsByKind[k.kind] = Number(k.n);
  const leads = Object.values(leadsByKind).reduce((a, b) => a + b, 0);
  const visitors = Number(h.visitors);
  const sessions = Number(h.sessions);
  return {
    visitors,
    sessions,
    views: Number(h.views),
    avgSessionMs: Number(h.avg_ms),
    bounceRate: sessions ? Number(h.bounces) / sessions : null,
    leads,
    conversion: visitors && start && start < p.to ? (sinceLeads ?? leads) / visitors : null,
    conversionSince: since,
    leadsByKind,
  };
}

export type SeriesPoint = { key: string; start: Date; visitors: number; views: number; leads: number };

async function series(p: Period, buckets: Bucket[], hourly: boolean): Promise<SeriesPoint[]> {
  const fmt = hourly ? `YYYY-MM-DD"T"HH24` : "YYYY-MM-DD";
  const [{ rows: v }, { rows: l }] = await Promise.all([
    db.execute<{ b: string; visitors: number; views: number }>(sql`
      select to_char(created_at at time zone 'Asia/Dubai', ${fmt}) as b, count(distinct visitor_hash)::int as visitors,
        count(*)::int as views
      from (${viewsIn(p)}) v group by 1`),
    db.execute<{ b: string; n: number }>(sql`
      select to_char(created_at at time zone 'Asia/Dubai', ${fmt}) as b, count(*)::int as n from (${leadsIn(p)}) l group by 1`),
  ]);
  const vm = new Map(v.map((r) => [r.b, r]));
  const lm = new Map(l.map((r) => [r.b, Number(r.n)]));
  return buckets.map((b) => ({
    ...b,
    visitors: Number(vm.get(b.key)?.visitors ?? 0),
    views: Number(vm.get(b.key)?.views ?? 0),
    leads: lm.get(b.key) ?? 0,
  }));
}

export type PageRow = { path: string; views: number; visitors: number; avgMs: number | null };
export type EntryRow = { path: string; sessions: number; bounceRate: number };
export type SourceRow = { channel: Channel; sessions: number; visitors: number; leads: number };
export type CampaignRow = { source: string | null; campaign: string | null; sessions: number; visitors: number; leads: number };
export type RefRow = { ref: string; sessions: number; visitors: number; leads: number };
export type CountRow = { key: string | null; visitors: number };
export type CityRow = { country: string | null; city: string | null; visitors: number };

/** A ranked table's rows: the ten with most visitors, plus every one that brought a lead (at most 20 in all). */
function topRows<T extends { visitors: number; sessions: number; leads: number }>(rows: T[]) {
  return [...rows]
    .sort((a, b) => b.visitors - a.visitors || b.sessions - a.sessions || b.leads - a.leads)
    .filter((r, i) => i < 10 || r.leads > 0)
    .slice(0, 20);
}

/**
 * The tables. `since`: when visit statistics started inside the period, the sources, campaigns and partner codes count
 * only the leads from then on (as the headline conversion does), so earlier leads can't pile up against no visitors.
 */
async function breakdowns(p: Period, since: Date | null) {
  const channel = channelSql(sql`referrer_host`, sql`utm_source`);
  const leadChannel = channelSql(sql`(source->>'referrer_host')`, sql`(source->>'utm_source')`);
  const lp: Period = since ? { from: since, to: p.to } : p;
  const q = <T extends Record<string, unknown>>(query: SQL) => db.execute<T>(query).then((r) => r.rows);
  const [pages, entries, sources, sourceLeads, campaigns, campaignLeads, refs, refLeads, countries, cities, devices, locales, browsers] =
    await Promise.all([
      q<{ path: string; views: number; visitors: number; avg_ms: number | null }>(sql`
        select path, count(*)::int as views, count(distinct visitor_hash)::int as visitors, avg(duration_ms)::float8 as avg_ms
        from (${viewsIn(p)}) v group by path order by views desc, path limit 12`),
      q<{ path: string; sessions: number; bounces: number }>(sql`
        with ${sessionsIn(p)}
        select e.path, count(*)::int as sessions, count(*) filter (where s.n = 1 and s.mx < ${BOUNCE_MS})::int as bounces
        from e join s using (session_id) group by e.path order by sessions desc, e.path limit 10`),
      q<{ channel: Channel; sessions: number; visitors: number }>(sql`
        with ${sessionsIn(p)}, c as (select e.*, ${channel} as channel from e)
        select channel, count(*)::int as sessions, count(distinct visitor_hash)::int as visitors from c group by channel`),
      q<{ channel: Channel; leads: number }>(sql`
        with l as (${leadsIn(lp)}), c as (select ${leadChannel} as channel from l)
        select channel, count(*)::int as leads from c group by channel`),
      q<{ source: string | null; campaign: string | null; sessions: number; visitors: number }>(sql`
        with ${sessionsIn(p)}
        select utm_source as source, utm_campaign as campaign, count(*)::int as sessions, count(distinct visitor_hash)::int as visitors
        from e where utm_source is not null or utm_campaign is not null
        group by 1, 2 order by sessions desc limit 500`),
      q<{ source: string | null; campaign: string | null; leads: number }>(sql`
        select source->>'utm_source' as source, source->>'utm_campaign' as campaign, count(*)::int as leads
        from (${leadsIn(lp)}) l where source->>'utm_source' is not null or source->>'utm_campaign' is not null group by 1, 2`),
      q<{ ref: string; sessions: number; visitors: number }>(sql`
        with ${sessionsIn(p)}
        select ref, count(*)::int as sessions, count(distinct visitor_hash)::int as visitors
        from e where ref is not null group by ref order by sessions desc limit 500`),
      q<{ ref: string; leads: number }>(sql`
        select source->>'ref' as ref, count(*)::int as leads from (${leadsIn(lp)}) l where source->>'ref' is not null group by 1`),
      q<{ key: string | null; visitors: number }>(sql`
        select country as key, count(distinct visitor_hash)::int as visitors from (${viewsIn(p)}) v
        group by country order by visitors desc, country limit 8`),
      q<{ country: string | null; city: string | null; visitors: number }>(sql`
        select country, city, count(distinct visitor_hash)::int as visitors from (${viewsIn(p)}) v
        where city is not null group by country, city order by visitors desc, city limit 8`),
      q<{ key: string | null; visitors: number }>(sql`
        select device as key, count(distinct visitor_hash)::int as visitors from (${viewsIn(p)}) v group by device order by visitors desc`),
      q<{ key: string | null; visitors: number }>(sql`
        select locale as key, count(distinct visitor_hash)::int as visitors from (${viewsIn(p)}) v group by locale order by visitors desc`),
      q<{ key: string | null; visitors: number }>(sql`
        select browser as key, count(distinct visitor_hash)::int as visitors from (${viewsIn(p)}) v
        group by browser order by visitors desc limit 6`),
    ]);

  const leadsByChannel = new Map(sourceLeads.map((r) => [r.channel, Number(r.leads)]));
  const byChannel = new Map(sources.map((r) => [r.channel, r]));
  const sourceRows: SourceRow[] = CHANNELS.map((channel) => ({
    channel,
    sessions: Number(byChannel.get(channel)?.sessions ?? 0),
    visitors: Number(byChannel.get(channel)?.visitors ?? 0),
    leads: leadsByChannel.get(channel) ?? 0,
  }))
    .filter((r) => r.sessions > 0 || r.leads > 0)
    .sort((a, b) => b.visitors - a.visitors || b.leads - a.leads);

  // Campaigns and partner codes: every one with visits or leads in the range (a form sent days after the click still
  // counts), merged before ranking, so a campaign outside the ten biggest never shows its leads against "0 visitors".
  const ck = (s: string | null, c: string | null) => `${s ?? ""}\u0000${c ?? ""}`;
  const campaignLeadMap = new Map(campaignLeads.map((r) => [ck(r.source, r.campaign), Number(r.leads)]));
  const campaignRows: CampaignRow[] = campaigns.map((r) => ({
    source: r.source,
    campaign: r.campaign,
    sessions: Number(r.sessions),
    visitors: Number(r.visitors),
    leads: campaignLeadMap.get(ck(r.source, r.campaign)) ?? 0,
  }));
  const seenCampaigns = new Set(campaigns.map((c) => ck(c.source, c.campaign)));
  for (const r of campaignLeads) {
    if (!seenCampaigns.has(ck(r.source, r.campaign))) campaignRows.push({ source: r.source, campaign: r.campaign, sessions: 0, visitors: 0, leads: Number(r.leads) });
  }
  const refLeadMap = new Map(refLeads.map((r) => [r.ref, Number(r.leads)]));
  const refRows: RefRow[] = refs.map((r) => ({
    ref: r.ref,
    sessions: Number(r.sessions),
    visitors: Number(r.visitors),
    leads: refLeadMap.get(r.ref) ?? 0,
  }));
  const seenRefs = new Set(refs.map((x) => x.ref));
  for (const r of refLeads) if (!seenRefs.has(r.ref)) refRows.push({ ref: r.ref, sessions: 0, visitors: 0, leads: Number(r.leads) });

  const num = <T extends { visitors: number }>(rows: T[]) => rows.map((r) => ({ ...r, visitors: Number(r.visitors) }));
  return {
    leadsSince: since,
    pages: pages.map(
      (r): PageRow => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors), avgMs: r.avg_ms == null ? null : Number(r.avg_ms) }),
    ),
    entries: entries.map((r): EntryRow => ({ path: r.path, sessions: Number(r.sessions), bounceRate: Number(r.bounces) / Number(r.sessions) })),
    sources: sourceRows,
    campaigns: topRows(campaignRows),
    refs: topRows(refRows),
    countries: num(countries) as CountRow[],
    cities: num(cities) as CityRow[],
    devices: num(devices) as CountRow[],
    locales: num(locales) as CountRow[],
    browsers: num(browsers) as CountRow[],
  };
}

export type LiveSession = { path: string; country: string | null; city: string | null; device: string | null; at: Date };

/**
 * Sessions with a page view in the last LIVE_MINUTES minutes: how many (all of them), and the most recent ones, each with
 * the page it is on now.
 */
export async function liveSessions(): Promise<{ total: number; sessions: LiveSession[] }> {
  const { rows } = await db.execute<{
    path: string;
    country: string | null;
    city: string | null;
    device: string | null;
    at_ms: number;
    total: number;
  }>(sql`
    select *, count(*) over ()::int as total from (
      select distinct on (session_id) path, country, city, device, (extract(epoch from created_at) * 1000)::float8 as at_ms
      from page_views where created_at > now() - make_interval(mins => ${LIVE_MINUTES})
      order by session_id, created_at desc
    ) x order by at_ms desc limit 200`);
  return {
    total: Number(rows[0]?.total ?? 0),
    sessions: rows.map((r) => ({ path: r.path, country: r.country, city: r.city, device: r.device, at: new Date(Number(r.at_ms)) })),
  };
}

export type JourneyStep = { path: string; at: Date; durationMs: number | null };
export type LeadJourney = {
  kind: LeadKind;
  id: string;
  createdAt: Date;
  label: string;
  refNo: number | null;
  linkId: string | null;
  source: Source | null;
  /** Pages of the tab's analytics session up to the moment the form was sent; null when there is no session to show. */
  steps: JourneyStep[] | null;
  /**
   * Why there is no page trail: an offer (made from an account; its source is how the buyer first arrived), a lead from
   * before visit statistics started, or a form that came without a session id (e.g. a browser blocking site storage).
   */
  noTrail: "account" | "before" | "noSid" | null;
  /** From the first recorded page to the lead, and the visible time on those pages. */
  spanMs: number | null;
  engagedMs: number | null;
};

const JOURNEY_LEADS = 20;
const JOURNEY_STEPS = 40;

/** The most recent leads in the period, each with the pages its visitor viewed before converting (when linked). */
async function journeys(p: Period, start: Date | null): Promise<LeadJourney[]> {
  const { rows } = await db.execute<{
    kind: LeadKind;
    id: string;
    created_ms: number;
    source: unknown;
    label: string | null;
    ref_no: number | null;
    link_id: string | null;
  }>(sql`
    select kind, id, (extract(epoch from created_at) * 1000)::float8 as created_ms, source, label, ref_no, link_id
    from (${leadsIn(p)}) l order by created_at desc limit ${JOURNEY_LEADS}`);
  const leads = rows.map((r) => {
    const source = sanitizeSource(typeof r.source === "string" ? safeJson(r.source) : r.source);
    return { ...r, createdAt: new Date(Number(r.created_ms)), source };
  });
  // An offer's source is the buyer's account (how they first arrived), not the visit the offer was made in.
  const sidOf = (l: (typeof leads)[number]) => (l.kind === "offer" ? undefined : l.source?.sid);
  const sids = [...new Set(leads.map(sidOf).filter((s): s is string => !!s))];
  const views = new Map<string, JourneyStep[]>();
  if (sids.length) {
    const { rows: vr } = await db.execute<{ session_id: string; path: string; at_ms: number; duration_ms: number | null }>(sql`
      select session_id, path, (extract(epoch from created_at) * 1000)::float8 as at_ms, duration_ms
      from page_views where session_id in (${sql.join(
        sids.map((s) => sql`${s}`),
        sql`, `,
      )})
      order by session_id, created_at limit 4000`);
    for (const v of vr) {
      const list = views.get(v.session_id) ?? [];
      list.push({ path: v.path, at: new Date(Number(v.at_ms)), durationMs: v.duration_ms == null ? null : Number(v.duration_ms) });
      views.set(v.session_id, list);
    }
  }
  return leads.map((l): LeadJourney => {
    const sid = sidOf(l);
    // The page with the form is recorded just before it is sent; allow a minute for slow connections.
    const steps = sid ? (views.get(sid) ?? []).filter((s) => s.at.getTime() <= l.createdAt.getTime() + 60_000).slice(-JOURNEY_STEPS) : null;
    const first = steps?.[0];
    const noTrail = sid ? null : l.kind === "offer" ? "account" : !start || l.createdAt < start ? "before" : "noSid";
    return {
      kind: l.kind,
      id: l.id,
      createdAt: l.createdAt,
      label: l.label ?? "",
      refNo: l.ref_no == null ? null : Number(l.ref_no),
      linkId: l.link_id,
      source: l.source,
      steps,
      noTrail,
      spanMs: first ? Math.max(0, l.createdAt.getTime() - first.at.getTime()) : null,
      engagedMs: steps?.length ? steps.reduce((a, s) => a + (s.durationMs ?? 0), 0) : null,
    };
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Today's visitors, who is on the site now and today's leads, for the tile on /admin. Null when it can't be read. */
export async function todaySnapshot(now = new Date()) {
  try {
    const p = rangeBounds("today", now).current;
    const {
      rows: [r],
    } = await db.execute<{ visitors: number; live: number; leads: number }>(sql`
      select
        (select count(distinct visitor_hash) from page_views where created_at >= ${at(p.from)})::int as visitors,
        (select count(distinct session_id) from page_views where created_at > now() - make_interval(mins => ${LIVE_MINUTES}))::int as live,
        (select count(*) from (${leadsIn(p)}) l)::int as leads`);
    return { visitors: Number(r.visitors), live: Number(r.live), leads: Number(r.leads) };
  } catch (err) {
    console.error("[analytics] today's numbers for /admin failed", err instanceof Error ? err.message.split("\n")[0] : err);
    return null;
  }
}

/** Everything /admin/analytics shows for one range. */
export async function analyticsReport(range: RangeKey, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const start = await trackingStart();
  const { from, to } = bounds.current;
  const since = start && start > from && start < to ? start : null;
  const [current, previous, points, detail, live, leads] = await Promise.all([
    headline(bounds.current, start),
    headline(bounds.previous, start),
    series(bounds.current, bounds.buckets, bounds.hourly),
    breakdowns(bounds.current, since),
    liveSessions(),
    journeys(bounds.current, start),
  ]);
  return { range, ...bounds, current, previous, points, ...detail, live, leads, generatedAt: now };
}

export type AnalyticsReport = Awaited<ReturnType<typeof analyticsReport>>;
