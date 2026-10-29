// Loads a partner network's units (scripts/partner-stock/*.json, the offplandistress-import/1 format with each photo's
// source URL instead of its bytes) into the database the way /admin/listings/import does — on the production build,
// where the database is reachable. Every listing is created in review, entered by staff, ownership not confirmed,
// under the network's placeholder owner (src/lib/import.ts), so nothing here is public until our team sets the owner,
// ownership is confirmed and the Trakheesi permit is in (src/app/actions/import.ts has the same rules). Runs again on
// every build: a unit already imported follows the file (syncListing: the network's changes applied unless our team
// edited the field, a unit marked "removed" withdrawn, one back on the site restored), photos still missing are fetched
// again, and the admins get one notice of what changed.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// PARTNER_STOCK_DIR: another folder of files, for a local test against a database copy.
const STOCK_DIR = process.env.PARTNER_STOCK_DIR || path.join(root, "scripts", "partner-stock");
const FORMAT = "offplandistress-import/1";
const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_WIDTH = 1024;
const FETCH_TIMEOUT_MS = 30_000;
const INT_MAX = 2_147_483_647;

export async function importPartnerStock(pool) {
  let names = [];
  try {
    // Beside each stock file: its permits (applyPermits) and the transcribed payment plans the daily sync keeps.
    names = (await readdir(STOCK_DIR)).filter((n) => n.endsWith(".json") && !n.endsWith("-permits.json") && !n.endsWith("-plans.json")).sort();
  } catch {
    return;
  }
  const sharp = await loadSharp();
  for (const name of names) {
    let doc;
    try {
      doc = JSON.parse(await readFile(path.join(STOCK_DIR, name), "utf8"));
    } catch (err) {
      console.error(`[import] ${name}: not readable`, err?.message ?? err);
      continue;
    }
    if (doc?.format !== FORMAT || !doc.source?.key || !Array.isArray(doc.units)) {
      console.error(`[import] ${name}: not an ${FORMAT} file`);
      continue;
    }
    await importSource(pool, doc, sharp);
  }
}

async function importSource(pool, doc, sharp) {
  const { source, units } = doc;
  const actor = await actorId(pool);
  const ownerId = await placeholderOwner(pool, source);
  if (!ownerId) {
    console.error(`[import] ${source.name}: its placeholder owner address is taken by an account that can sign in — nothing imported.`);
    return;
  }
  let created = 0;
  let photos = 0;
  let failed = 0;
  const report = { updated: [], withdrawn: [], restored: [], conflicts: [], deals: [], valve: 0 };
  const removed = [];
  for (const unit of units) {
    try {
      // A unit the network no longer lists ("removed": the day it went) is withdrawn below, all at once (the valve).
      if (unit?.removed != null) {
        if (!isoDay(unit.removed)) throw new Error("bad removed date");
        removed.push(unit);
        continue;
      }
      const { id, isNew } = await ensureListing(pool, source, unit, ownerId, actor);
      if (isNew) created++;
      else await syncListing(pool, unit, id, actor, report);
      photos += await ensurePhotos(pool, id, unit.photos ?? [], actor ?? ownerId, sharp);
    } catch (err) {
      failed++;
      console.error(`[import] ${source.name} ${unit?.ref}: failed`, err?.message ?? err);
    }
  }
  await withdrawRemoved(pool, source, removed, doc.sync?.allowMassRemoval === true, actor, report);
  console.log(`[import] ${source.name}: ${created} listings created, ${photos} photos added, ${failed} failed (${units.length} in the file).`);
  console.log(
    `[sync] ${source.name}: ${report.updated.length} updated, ${report.withdrawn.length} withdrawn, ${report.restored.length} restored, ` +
      `${report.conflicts.length} edited by our team (left), ${report.deals.length} deals in progress (left)` +
      `${report.valve ? `, VALVE TRIPPED: ${report.valve} removals, nothing withdrawn` : ""}.`,
  );
  if (created) await tellAdmins(pool, source, created);
  if (report.updated.length || report.withdrawn.length || report.restored.length || report.conflicts.length || report.deals.length || report.valve) {
    await tellAdminsSynced(pool, source, { created, failed, ...report });
  }
  await applyPermits(pool, source, actor);
}

// ——— Sync: units already imported follow the file, which is regenerated from the network ———————————————————————————

/** The listing fields the file keeps in step; the rest (project, developer, unit type…) are set once, at import. */
const SYNCED_FIELDS = ["askingPrice", "originalPrice", "amountPaid", "nextInstalmentDate", "nextInstalmentAmount", "paymentPlan", "handoverDate", "sizeSqft", "floor", "view", "description"];
const COLUMNS = {
  askingPrice: "asking_price",
  originalPrice: "original_price",
  amountPaid: "amount_paid",
  nextInstalmentDate: "next_instalment_date",
  nextInstalmentAmount: "next_instalment_amount",
  paymentPlan: "payment_plan",
  handoverDate: "handover_date",
  sizeSqft: "size_sqft",
  floor: "floor",
  view: "view",
  description: "description",
};
/** The statuses the sync may change: in review, live or paused. src/lib/offers.ts DEAL_STATUSES, src/lib/config.ts PUBLIC_STATUSES. */
const LISTED = ["pending_review", "live", "paused"];
const DEAL_STATUSES = ["under_offer", "noc_in_progress"];
const PUBLIC_STATUSES = ["live", "under_offer", "noc_in_progress"];
/** The valve (withdrawRemoved): more than this many, and more than a quarter of the source's listed units, in one build. */
const VALVE_MIN = 3;

/** JSON with the keys in order, so a value read back from jsonb (keys sorted) compares equal to the one written. */
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : (v ?? null));
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const text = (s) => (s == null || s === "" ? null : s);
const plan = (p) => (Array.isArray(p) ? p.map((i) => ({ label: i?.label ?? null, dueDate: i?.dueDate ?? null, amount: i?.amount ?? null })) : []);
const refCode = (n) => `OD-${1000 + n}`;

/** The synced fields of a checked unit, a listings row or a stored snapshot, as comparable values (dates "YYYY-MM-DD", empty text null). */
function valuesOf(l) {
  const dateOf = (v) => (v == null ? null : typeof v === "string" ? v.slice(0, 10) : day(v));
  return {
    askingPrice: l.askingPrice ?? l.asking_price ?? null,
    originalPrice: l.originalPrice ?? l.original_price ?? null,
    amountPaid: l.amountPaid ?? l.amount_paid ?? null,
    nextInstalmentDate: dateOf(l.nextInstalmentDate ?? l.next_instalment_date),
    nextInstalmentAmount: l.nextInstalmentAmount ?? l.next_instalment_amount ?? null,
    paymentPlan: plan(l.paymentPlan ?? l.payment_plan),
    handoverDate: dateOf(l.handoverDate ?? l.handover_date),
    sizeSqft: l.sizeSqft ?? l.size_sqft ?? null,
    floor: text(l.floor),
    view: text(l.view),
    description: text(l.description),
  };
}

/** One audit_events row, as src/lib/audit.ts writes them (no IP: the build has none). */
const auditRow = (client, actor, action, id, diff) =>
  client.query("insert into audit_events (actor_id, action, entity_type, entity_id, diff) values ($1, $2, 'listing', $3, $4)", [actor, action, id, JSON.stringify(diff)]);

/** An accepted offer or an open deal file: the unit's deal is in progress whatever its status (a unit paused under offer keeps both). */
async function dealInProgress(client, id) {
  const { rows } = await client.query(
    `select exists (select 1 from offers where listing_id = $1 and status = 'accepted')
         or exists (select 1 from deals where listing_id = $1 and cancelled_at is null) as deal`,
    [id],
  );
  return rows[0].deal;
}

/** src/lib/permits.ts publishBlocker: why the listing can't be made public today, or null. */
function publishBlocker(r, today) {
  if (r.is_sample) return null;
  const expires = day(r.dld_permit_expires_at);
  const formA = day(r.form_a_expires_at);
  if (!r.dld_permit) {
    if (!r.permit_attested_at) return "permit";
  } else if (!expires || expires <= today) return "permit expiry";
  if (formA && formA <= today) return "Form A";
  return null;
}

/** src/lib/permits.ts permitLapsed: the advert's permit or Form A ran out before today. */
function permitLapsed(r, today) {
  if (r.is_sample) return false;
  const expires = day(r.dld_permit_expires_at);
  const formA = day(r.form_a_expires_at);
  return (expires != null && expires < today) || (formA != null && formA < today);
}

/**
 * A unit already imported: the file's value of each synced field is applied where ours is still the one last synced
 * (listings.source.synced, the snapshot; a row without one only takes the file's value for a field never filled in)
 * and the snapshot is refreshed. A field our team edited since keeps their value: a conflict, reported to the admins once
 * (source.sync.conflicts remembers it) and again only when the network changes it anew, forgotten once the two agree.
 * On a public advert the advertised price follows the asking price, with the price-drop notices, as the listing editor
 * does. A unit the sync withdrew earlier that is back on the network is restored first: live again when it was live
 * and could be approved today (ownership confirmed, a current permit or the attestation, Form A — Approve's rules),
 * else into review. A unit with a deal in progress (under offer, NOC in progress, an accepted offer or an open deal
 * file) is never changed, only reported when the file would have changed it; a sold, rejected or withdrawn one is left.
 */
async function syncListing(pool, unit, id, actor, report) {
  const wanted = valuesOf(checkListing(unit.listing));
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `select id, ref_no, status, is_sample, seller_id, project_name, asking_price, public_price, original_price, amount_paid,
              next_instalment_date, next_instalment_amount, payment_plan, handover_date, size_sqft, floor, view, description,
              dld_permit, dld_permit_expires_at, form_a_expires_at, permit_attested_at, created_by_staff, ownership_confirmed_at, source
       from listings where id = $1 for update`,
      [id],
    );
    const row = rows[0];
    if (!row || row.is_sample) {
      await client.query("rollback");
      return;
    }
    const code = refCode(row.ref_no);
    const src = row.source ?? {};
    const state = { ...(src.sync ?? {}) };
    const have = valuesOf(row);
    const changed = SYNCED_FIELDS.filter((f) => !same(wanted[f], have[f]));
    const now = new Date();
    const today = dubaiToday();
    let status = row.status;
    const restoring = status === "withdrawn" && state.removedAt != null;
    if (!restoring && !LISTED.includes(status)) {
      if (DEAL_STATUSES.includes(status) && changed.length) report.deals.push({ code, status, fields: changed });
      await client.query("rollback");
      return;
    }
    if (await dealInProgress(client, id)) {
      if (restoring || changed.length) report.deals.push({ code, status, fields: changed, back: restoring });
      await client.query("rollback");
      return;
    }
    if (restoring) {
      // Back on the network: live again where Approve would publish it, else into review for our team.
      const awaitsOwner = row.created_by_staff && row.ownership_confirmed_at == null;
      const live = state.withdrawnFrom === "live" && !awaitsOwner && !publishBlocker(row, today);
      status = live ? "live" : "pending_review";
      await client.query(
        `update listings set status = $2, public_price = case when $3 then asking_price else public_price end,
                published_at = case when $3 then coalesce(published_at, $4) else published_at end,
                rejection_reason = case when $3 then null else rejection_reason end, paused_by_admin = false, updated_at = $4
         where id = $1`,
        [id, status, live, now],
      );
      const diff = { status: ["withdrawn", status] };
      if (live) diff.publicPrice = [row.public_price, row.asking_price];
      await auditRow(client, actor, "listing.sync_restored", id, diff);
      // A price cut while it was off the market reaches the watchers once it is public again, as from Approve.
      if (live && row.public_price != null) await tellWatchers(client, row, row.public_price, row.asking_price);
      delete state.removedAt;
      delete state.withdrawnFrom;
      state.restoredAt = now.toISOString();
      report.restored.push({ code, status });
      if (live) row.public_price = row.asking_price;
    } else if (state.removedAt != null) {
      // Withdrawn by an earlier build and put back by our team since; the unit is on the network again: theirs stands.
      delete state.removedAt;
      delete state.withdrawnFrom;
    }
    // The fields: the file's value where ours is still the one last synced, else our team's edit stands (a conflict).
    // A row without a snapshot (imported before the sync existed, or by hand through /admin/listings/import): nothing
    // says whether a value that differs from the file is our team's edit or the network's change, so only a field
    // never filled in takes the file's value; the rest stand, as conflicts, and the snapshot starts from the file.
    const unfilled = (v) => v == null || (Array.isArray(v) && v.length === 0);
    const snap = src.synced ? valuesOf(src.synced) : Object.fromEntries(SYNCED_FIELDS.map((f) => [f, unfilled(have[f]) ? have[f] : wanted[f]]));
    const diff = {};
    const conflicts = {};
    const synced = {};
    for (const f of SYNCED_FIELDS) {
      if (same(wanted[f], have[f]) || same(have[f], snap[f])) {
        synced[f] = wanted[f];
        if (!same(wanted[f], have[f])) diff[f] = [have[f], wanted[f]];
      } else {
        conflicts[f] = wanted[f];
        synced[f] = snap[f];
      }
    }
    // Paid never above the SPA price (the file keeps the pair together; with one side kept as our team's, neither moves).
    const after = (f) => (f in diff ? wanted[f] : have[f]);
    if (after("amountPaid") > after("originalPrice")) {
      for (const f of ["amountPaid", "originalPrice"]) {
        if (!(f in diff)) continue;
        delete diff[f];
        conflicts[f] = wanted[f];
        synced[f] = snap[f];
      }
    }
    const fields = Object.keys(diff);
    if (fields.length) {
      // The advertised price follows the asking price while the public sees the advert (src/lib/permits.ts isAdvertised).
      const advertised = PUBLIC_STATUSES.includes(status) && !permitLapsed(row, today);
      const sets = fields.map((f, i) => `${COLUMNS[f]} = $${i + 2}`);
      const params = [id, ...fields.map((f) => (f === "paymentPlan" ? JSON.stringify(wanted[f]) : wanted[f]))];
      if (diff.askingPrice && advertised) {
        diff.publicPrice = [row.public_price, wanted.askingPrice];
        sets.push(`public_price = $${params.push(wanted.askingPrice)}`);
      }
      await client.query(`update listings set ${sets.join(", ")}, updated_at = $${params.push(now)} where id = $1`, params);
      await auditRow(client, actor, "listing.update", id, diff);
      if (diff.askingPrice && advertised) await tellWatchers(client, row, row.public_price ?? row.asking_price, wanted.askingPrice);
      report.updated.push({ code, fields });
    }
    // Conflicts: told once, until the network changes the field again; forgotten once the two agree.
    const told = state.conflicts ?? {};
    const fresh = Object.keys(conflicts).filter((f) => !(f in told) || !same(told[f], conflicts[f]));
    if (fresh.length) report.conflicts.push({ code, fields: fresh });
    if (Object.keys(conflicts).length) state.conflicts = conflicts;
    else delete state.conflicts;
    // The snapshot and the sync's own state, written when either changed (so a build that changes nothing writes nothing).
    const next = { ...src, synced: { ...synced, syncedAt: now.toISOString() } };
    if (Object.keys(state).length) next.sync = state;
    else delete next.sync;
    if (!src.synced || !same(valuesOf(src.synced), synced) || !same(src.sync ?? null, next.sync ?? null)) {
      await client.query("update listings set source = $2 where id = $1", [id, JSON.stringify(next)]);
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Units the file marks "removed" (gone from the network since that day) are withdrawn as the seller's own withdrawal
 * is (src/app/actions/listings.ts setMyListingStatus): status withdrawn, the buyers with an open offer told it is no
 * longer available, audited with the reason; listings.source.sync keeps the day and the status it had, so a later
 * build can restore it (syncListing) and a second build does nothing. Only a unit in review, live or paused: one with a
 * deal in progress is reported and left, a sold, rejected or withdrawn one ignored. The valve: more than VALVE_MIN and
 * more than a quarter of the source's listed units going in one build looks like a broken file (the network's site
 * down, say), so nothing is withdrawn and the admins are told — unless the file's sync.allowMassRemoval says so.
 */
async function withdrawRemoved(pool, source, removed, allowMass, actor, report) {
  if (!removed.length) return;
  const {
    rows: [{ listed }],
  } = await pool.query("select count(*)::int as listed from listings where source->>'import' = $1 and status = any($2) and not is_sample", [source.key, LISTED]);
  const due = [];
  for (const unit of removed) {
    const { rows } = await pool.query("select id, ref_no, status, source from listings where source->>'import' = $1 and source->>'ref' = $2 limit 1", [
      source.key,
      unit.ref,
    ]);
    const row = rows[0];
    // Never imported, or withdrawn by an earlier build (and maybe put back by our team since: theirs to keep).
    if (!row || row.source?.sync?.removedAt != null) continue;
    const code = refCode(row.ref_no);
    if (DEAL_STATUSES.includes(row.status) || (LISTED.includes(row.status) && (await dealInProgress(pool, row.id)))) {
      report.deals.push({ code, status: row.status, removed: true });
      continue;
    }
    if (LISTED.includes(row.status)) due.push({ unit, id: row.id, code });
  }
  if (!allowMass && due.length > VALVE_MIN && due.length > listed / 4) {
    report.valve = due.length;
    console.error(
      `[sync] ${source.name}: VALVE TRIPPED — ${due.length} of ${listed} listed units would be withdrawn in one build; nothing withdrawn. ` +
        "Check the manifest (sync.allowMassRemoval in the file lets a real mass removal through).",
    );
    return;
  }
  for (const d of due) {
    try {
      await withdrawListing(pool, d, actor, report);
    } catch (err) {
      console.error(`[sync] ${source.name} ${d.unit.ref}: withdraw failed`, err?.message ?? err);
    }
  }
}

async function withdrawListing(pool, { unit, id, code }, actor, report) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query("select status, project_name, source from listings where id = $1 for update", [id]);
    const row = rows[0];
    // Changed by someone else since the look above (published, withdrawn, a deal agreed): left as they made it.
    if (!row || !LISTED.includes(row.status) || row.source?.sync?.removedAt != null || (await dealInProgress(client, id))) {
      await client.query("rollback");
      return;
    }
    const now = new Date();
    const src = row.source ?? {};
    const next = { ...src, sync: { ...(src.sync ?? {}), removedAt: unit.removed, withdrawnFrom: row.status } };
    delete next.sync.restoredAt;
    await client.query("update listings set status = 'withdrawn', paused_by_admin = false, updated_at = $2, source = $3 where id = $1", [id, now, JSON.stringify(next)]);
    await auditRow(client, actor, "listing.sync_withdrawn", id, { status: [row.status, "withdrawn"], reason: "removed_from_source", removedAt: unit.removed });
    // Off the market: the buyers with an open offer on it are told it is no longer available (src/lib/offers.ts closeOpenOffers).
    const { rows: closed } = await client.query(
      "update offers set status = 'declined', updated_at = $2 where listing_id = $1 and status in ('pending', 'countered') returning buyer_id, amount",
      [id, now],
    );
    await tellBuyers(client, closed, row.project_name);
    await client.query("commit");
    report.withdrawn.push({ code });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// The in-app notices the app would send (src/lib/notify.ts, the copy of src/lib/notification-templates.ts), each in the
// recipient's language; the build sends no email.
const numberFmt = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });
const aed = (n, ar) => (ar ? `${numberFmt.format(n)} درهم` : `AED ${numberFmt.format(n)}`);

/** offer.unit_unavailable, to each buyer whose offer was just closed. */
async function tellBuyers(client, closed, project) {
  if (!closed.length) return;
  const { rows: users } = await client.query("select id, coalesce(locale, 'en') as locale from users where id = any($1)", [closed.map((o) => o.buyer_id)]);
  for (const o of closed) {
    const ar = users.find((u) => u.id === o.buyer_id)?.locale === "ar";
    await client.query("insert into notifications (user_id, type, title, body, href) values ($1, 'offer.unit_unavailable', $2, $3, '/deals')", [
      o.buyer_id,
      ar ? `لم تعد الوحدة في ${project} متاحة` : `${project} is no longer available`,
      ar ? `لم تعد الوحدة متاحة، لذلك أُغلق عرضك البالغ ${aed(o.amount, true)}.` : `The unit is no longer available, so your offer of ${aed(o.amount)} was closed.`,
    ]);
  }
}

/** watch.price_drop, to everyone watching the deal but its seller, when the asking price fell (notifyPriceDrop). */
async function tellWatchers(client, row, from, to) {
  if (!(to < from)) return;
  const { rows } = await client.query(
    "select w.user_id, coalesce(u.locale, 'en') as locale from watchlist w join users u on u.id = w.user_id where w.listing_id = $1 and w.user_id <> $2",
    [row.id, row.seller_id],
  );
  for (const w of rows) {
    const ar = w.locale === "ar";
    await client.query("insert into notifications (user_id, type, title, body, href) values ($1, 'watch.price_drop', $2, $3, $4)", [
      w.user_id,
      ar ? `انخفاض سعر ${row.project_name}` : `Price drop on ${row.project_name}`,
      ar ? `انخفض السعر المطلوب من ${aed(from, true)} إلى ${aed(to, true)}.` : `The asking price fell from ${aed(from)} to ${aed(to)}.`,
      `/deals/${refCode(row.ref_no)}`,
    ]);
  }
}

const FIELD_LABELS = {
  en: {
    askingPrice: "asking price",
    originalPrice: "SPA price",
    amountPaid: "paid to the developer",
    nextInstalmentDate: "next instalment date",
    nextInstalmentAmount: "next instalment amount",
    paymentPlan: "payment plan",
    handoverDate: "handover",
    sizeSqft: "size",
    floor: "floor",
    view: "view",
    description: "description",
  },
  ar: {
    askingPrice: "السعر المطلوب",
    originalPrice: "سعر اتفاقية البيع والشراء",
    amountPaid: "المدفوع للمطوّر",
    nextInstalmentDate: "موعد القسط التالي",
    nextInstalmentAmount: "قيمة القسط التالي",
    paymentPlan: "خطة الدفع",
    handoverDate: "التسليم",
    sizeSqft: "المساحة",
    floor: "الطابق",
    view: "الإطلالة",
    description: "الوصف",
  },
};
/** The statuses' names (src/i18n/messages/common.ts). */
const STATUS_LABELS = {
  en: { pending_review: "Under review", live: "Live", under_offer: "Offer accepted", noc_in_progress: "NOC in progress", paused: "Paused" },
  ar: { pending_review: "قيد المراجعة", live: "منشور", under_offer: "تم قبول عرض", noc_in_progress: "قيد إصدار شهادة عدم الممانعة", paused: "متوقف مؤقتاً" },
};

/** One in-app notice per admin with what the sync did, in their language (the build log names every unit). */
async function tellAdminsSynced(pool, source, r) {
  const { rows } = await pool.query("select id, coalesce(locale, 'en') as locale from users where role = 'admin'");
  for (const a of rows) {
    const { title, body } = syncNotice(source, r, a.locale === "ar" ? "ar" : "en");
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.synced', $2, $3, '/admin?tab=imported')", [a.id, title, body]);
  }
}

function syncNotice(source, r, lang) {
  const ar = lang === "ar";
  const sep = ar ? "، " : ", ";
  const list = (items) => {
    const more = Math.max(items.length - 25, 0);
    return items.slice(0, 25).join(sep) + (more ? (ar ? `، و${more} أخرى` : `, and ${more} more`) : "");
  };
  const fields = (fs) => fs.map((f) => FIELD_LABELS[lang][f] ?? f).join(sep);
  const status = (s) => STATUS_LABELS[lang][s] ?? s;
  const change = (d) => (d.removed ? (ar ? "أُزيلت من المصدر" : "removed from the source") : d.back ? (ar ? "عادت إلى المصدر" : "back on the source") : fields(d.fields));
  const lines = [
    ar
      ? `أُنشئ ${r.created}، حُدّث ${r.updated.length}، سُحب ${r.withdrawn.length}، أُعيد ${r.restored.length}.`
      : `Created ${r.created}, updated ${r.updated.length}, withdrawn ${r.withdrawn.length}, restored ${r.restored.length}.`,
  ];
  if (r.updated.length) lines.push(`${ar ? "حُدّثت من المصدر: " : "Updated from the source: "}${list(r.updated.map((u) => `${u.code} (${fields(u.fields)})`))}.`);
  if (r.withdrawn.length) lines.push(`${ar ? `سُحبت لأنها لم تعد معروضة على ${source.name}: ` : `Withdrawn, no longer on ${source.name}: `}${list(r.withdrawn.map((w) => w.code))}.`);
  if (r.restored.length) {
    lines.push(`${ar ? `عادت إلى ${source.name} فأُعيدت: ` : `Back on ${source.name}, restored: `}${list(r.restored.map((x) => `${x.code} (${status(x.status)})`))}.`);
  }
  if (r.conflicts.length) {
    lines.push(
      `${ar ? "تغيّرت على المصدر لكن فريقنا عدّلها منذ آخر مزامنة، فتُركت كما هي: " : "Changed on the source but edited by our team since the last sync, so left as they are: "}` +
        `${list(r.conflicts.map((c) => `${c.code} (${fields(c.fields)})`))}.`,
    );
  }
  if (r.deals.length) lines.push(`${ar ? "صفقات جارية تُركت كما هي: " : "Deals in progress, left alone: "}${list(r.deals.map((d) => `${d.code} (${status(d.status)}; ${change(d)})`))}.`);
  if (r.valve) lines.push(ar ? `توقّف صمام أمان المزامنة: ${r.valve} إزالة، لم يُسحب شيء — راجع ملف المخزون.` : `Sync valve tripped: ${r.valve} removals, nothing withdrawn — check the manifest.`);
  if (r.failed) lines.push(ar ? `${r.failed} وحدة فشلت — راجع سجل البناء.` : `${r.failed} units failed — see the build log.`);
  const title = r.valve
    ? ar
      ? `مزامنة ${source.name}: توقّف صمام الأمان، لم يُسحب شيء`
      : `${source.name} sync: valve tripped, nothing withdrawn`
    : ar
      ? `مزامنة ${source.name}: ${r.updated.length} حُدّث، ${r.withdrawn.length} سُحب، ${r.restored.length} أُعيد`
      : `${source.name} sync: ${r.updated.length} updated, ${r.withdrawn.length} withdrawn, ${r.restored.length} restored`;
  return { title, body: lines.join("\n") };
}

const PERMITS_FORMAT = "offplandistress-permits/1";
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const dubaiToday = () => new Date(Date.now() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
const addYears = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y + n, m - 1, d)).toISOString().slice(0, 10);
};
const isoDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isDldUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && (u.hostname === "dubailand.gov.ae" || u.hostname.endsWith(".dubailand.gov.ae"));
  } catch {
    return false;
  }
};

/**
 * The network's units' DLD (Trakheesi) advertising permits, from scripts/partner-stock/<key>-permits.json
 * ({format: "offplandistress-permits/1", source: "<key>", permits: [{ref, permit, expires, formAExpires?, url?}]}),
 * applied the way the admin editor + Approve do: the permit fields, ownership confirmed on our team's record of the
 * owner's written authority (the account owner's statement — the real owner is still entered afterwards from the
 * Owner card), then the listing goes live at its asking price. Only a unit still in review goes live; a permit entered
 * differently later only updates the permit fields. Nothing goes live without a permit that is current (RERA). A unit
 * published on the account owner's attestation without a number (listings.permit_attested_at, src/lib/attestation.ts)
 * gets its number here too, and the attestation is cleared with it, as the editor does: the number is then the record.
 */
async function applyPermits(pool, source, actor) {
  let doc;
  try {
    doc = JSON.parse(await readFile(path.join(STOCK_DIR, `${source.key}-permits.json`), "utf8"));
  } catch {
    return;
  }
  if (doc?.format !== PERMITS_FORMAT || doc.source !== source.key || !Array.isArray(doc.permits)) {
    console.error(`[permits] ${source.key}-permits.json: not an ${PERMITS_FORMAT} file for ${source.key}`);
    return;
  }
  const today = dubaiToday();
  const maxExpiry = addYears(today, 3);
  let live = 0;
  let updated = 0;
  let skipped = 0;
  for (const p of doc.permits) {
    const ref = typeof p?.ref === "string" ? p.ref.trim() : "";
    const permit = typeof p?.permit === "string" ? p.permit.trim().slice(0, 80) : "";
    const why = !ref
      ? "no ref"
      : !permit
        ? "no permit number"
        : !isoDay(p.expires) || p.expires <= today || p.expires > maxExpiry
          ? "the permit expiry must be a date after today, within three years"
          : p.formAExpires != null && (!isoDay(p.formAExpires) || p.formAExpires <= today || p.formAExpires > maxExpiry)
            ? "the Form A expiry must be a date after today, within three years"
            : p.url != null && !isDldUrl(p.url)
              ? "the verification link must be https on dubailand.gov.ae"
              : null;
    if (why) {
      skipped++;
      console.error(`[permits] ${source.key} ${ref || "?"}: skipped — ${why}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(
        `select id, status, is_sample, asking_price, published_at, ownership_confirmed_at, dld_permit, dld_permit_expires_at,
                form_a_expires_at, dld_permit_url, permit_attested_at
         from listings where source->>'import' = $1 and source->>'ref' = $2 for update`,
        [source.key, ref],
      );
      const l = rows[0];
      if (!l || l.is_sample) {
        await client.query("rollback");
        skipped++;
        console.error(`[permits] ${source.key} ${ref}: skipped — no such imported listing`);
        continue;
      }
      const now = new Date();
      // With the number in, the attestation (if any) goes: the number is the record.
      const wanted = { dldPermit: permit, dldPermitExpiresAt: p.expires, formAExpiresAt: p.formAExpires ?? null, dldPermitUrl: p.url ?? null, permitAttestedAt: null };
      const have = {
        dldPermit: l.dld_permit,
        dldPermitExpiresAt: day(l.dld_permit_expires_at),
        formAExpiresAt: day(l.form_a_expires_at),
        dldPermitUrl: l.dld_permit_url,
        permitAttestedAt: l.permit_attested_at ? new Date(l.permit_attested_at).toISOString() : null,
      };
      const diff = {};
      for (const k of Object.keys(wanted)) if ((have[k] ?? null) !== (wanted[k] ?? null)) diff[k] = [have[k] ?? null, wanted[k] ?? null];
      if (Object.keys(diff).length) {
        await client.query(
          `update listings set dld_permit = $2, dld_permit_expires_at = $3, form_a_expires_at = $4, dld_permit_url = $5,
                  permit_attested_at = null, permit_attested_by = null, updated_at = $6 where id = $1`,
          [l.id, wanted.dldPermit, wanted.dldPermitExpiresAt, wanted.formAExpiresAt, wanted.dldPermitUrl, now],
        );
        await client.query("insert into audit_events (actor_id, action, entity_type, entity_id, diff) values ($1, 'listing.update', 'listing', $2, $3)", [
          actor,
          l.id,
          JSON.stringify(diff),
        ]);
        updated++;
      }
      if (!l.ownership_confirmed_at) {
        await client.query("update listings set ownership_confirmed_at = $2, updated_at = $2 where id = $1", [l.id, now]);
        await client.query(
          "insert into audit_events (actor_id, action, entity_type, entity_id, diff) values ($1, 'listing.ownership_confirmed', 'listing', $2, $3)",
          [actor, l.id, JSON.stringify({ via: "broker_statement", ownershipConfirmedAt: [null, now.toISOString()] })],
        );
      }
      if (l.status === "pending_review") {
        await client.query(
          `update listings set status = 'live', public_price = asking_price, published_at = coalesce(published_at, $2), rejection_reason = null, updated_at = $2
           where id = $1`,
          [l.id, now],
        );
        await client.query("insert into audit_events (actor_id, action, entity_type, entity_id, diff) values ($1, 'listing.approve', 'listing', $2, $3)", [
          actor,
          l.id,
          JSON.stringify({ status: ["pending_review", "live"], publicPrice: [null, l.asking_price] }),
        ]);
        live++;
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      skipped++;
      console.error(`[permits] ${source.key} ${ref}: failed`, err?.message ?? err);
    } finally {
      client.release();
    }
  }
  console.log(`[permits] ${source.name}: ${live} listings went live, ${updated} permits recorded, ${skipped} skipped (${doc.permits.length} in the file).`);
  if (live) await tellAdminsLive(pool, source, live);
}

/** A date column as "YYYY-MM-DD" (pg returns a Date in local time for `date` columns). */
function day(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.slice(0, 10);
  return new Date(v.getTime() - v.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

async function tellAdminsLive(pool, source, live) {
  const { rows } = await pool.query("select id, coalesce(locale, 'en') as locale from users where role = 'admin'");
  for (const a of rows) {
    const ar = a.locale === "ar";
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.imported_live', $2, $3, '/deals')", [
      a.id,
      ar ? `أصبح ${live} إعلانًا من ${source.name} منشورًا` : `${live} listings from ${source.name} are now live`,
      ar
        ? "نُشرت بتصاريح الإعلان المسجّلة. يبقى تحديد المالك الفعلي لكل إعلان من بطاقة «المالك» في صفحته."
        : "They were published with the advertising permits on file. The real owner of each still gets entered from the Owner card on its page.",
    ]);
  }
}

/** The owner account (first admin) — the import's actor in the audit trail and the photos' uploader. */
async function actorId(pool) {
  const { rows } = await pool.query("select id from users where role = 'admin' order by created_at limit 1");
  return rows[0]?.id ?? null;
}

async function placeholderOwner(pool, source) {
  const email = `owner-pending.${source.key}@offplandistress.invalid`;
  await pool.query(
    `insert into users (email, full_name, password_hash, role, intent, locale)
     values ($1, $2, null, 'user', 'sell', 'en') on conflict do nothing`,
    [email, `Owner to be added (${source.name})`],
  );
  const { rows } = await pool.query("select id, role, password_hash from users where lower(email) = $1", [email]);
  const owner = rows[0];
  return owner && owner.role === "user" && owner.password_hash == null ? owner.id : null;
}

/** The unit's listing: the one already imported from this source (same ref), else a new one in review. */
async function ensureListing(pool, source, unit, ownerId, actor) {
  const found = await pool.query("select id from listings where source->>'import' = $1 and source->>'ref' = $2 limit 1", [
    source.key,
    unit.ref,
  ]);
  if (found.rows[0]) return { id: found.rows[0].id, isNew: false };
  const l = checkListing(unit.listing);
  const now = new Date().toISOString();
  const provenance = {
    import: source.key,
    sourceName: source.name,
    ref: unit.ref,
    url: unit.url ?? null,
    posted: unit.posted ?? null,
    notes: unit.notes ?? null,
    importedAt: now,
    importedBy: actor,
    // The values as synced from the file, so a later build can tell our team's edits from the network's changes.
    synced: { ...valuesOf(l), syncedAt: now },
  };
  const inserted = await pool.query(
    `insert into listings (
       seller_id, status, project_name, developer, community, developer_other, community_other, unit_type, size_sqft,
       floor, view, original_price, amount_paid, asking_price, handover_date, next_instalment_date,
       next_instalment_amount, motivation, description, payment_plan, source, created_by_staff, ownership_confirmed_at
     ) values ($1, 'pending_review', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, null)
     on conflict ((source->>'import'), (source->>'ref')) where source->>'import' is not null do nothing
     returning id`,
    [
      ownerId,
      l.projectName,
      l.developer,
      l.community,
      l.developer === "Other" ? l.developerOther : null,
      l.community === "Other" ? l.communityOther : null,
      l.unitType,
      l.sizeSqft,
      l.floor,
      l.view,
      l.originalPrice,
      l.amountPaid,
      l.askingPrice,
      l.handoverDate,
      l.nextInstalmentDate,
      l.nextInstalmentAmount,
      l.motivation,
      l.description,
      JSON.stringify(l.paymentPlan),
      JSON.stringify(provenance),
    ],
  );
  const row = inserted.rows[0];
  if (!row) {
    // Imported at the same moment by another build: the unique index on (source key, ref) kept one.
    const again = await pool.query("select id from listings where source->>'import' = $1 and source->>'ref' = $2 limit 1", [source.key, unit.ref]);
    if (!again.rows[0]) throw new Error("not inserted");
    return { id: again.rows[0].id, isNew: false };
  }
  await pool.query(
    `insert into audit_events (actor_id, action, entity_type, entity_id, diff)
     values ($1, 'listing.import', 'listing', $2, $3)`,
    [
      actor,
      row.id,
      JSON.stringify({
        status: [null, "pending_review"],
        projectName: [null, l.projectName],
        originalPrice: [null, l.originalPrice],
        amountPaid: [null, l.amountPaid],
        askingPrice: [null, l.askingPrice],
        importSource: source.name,
        importRef: unit.ref,
      }),
    ],
  );
  return { id: row.id, isNew: true };
}

/** The same rules as src/lib/listing-schema.ts, for the fields a file can carry; a bad unit throws and is skipped. */
function checkListing(v) {
  const str = (s, max, required = false) => {
    const t = typeof s === "string" ? s.trim() : "";
    if (required && t.length < 2) throw new Error("missing text field");
    return t ? t.slice(0, max) : null;
  };
  const money = (n, { positive = false } = {}) => {
    if (!Number.isInteger(n) || n < 0 || n > INT_MAX || (positive && n <= 0)) throw new Error("bad amount");
    return n;
  };
  const date = (s) => {
    if (s == null) return null;
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new Error("bad date");
    return s;
  };
  if (!v || typeof v !== "object") throw new Error("no listing");
  const unitTypes = ["studio", "1br", "2br", "3br", "4br", "5br", "townhouse", "villa", "penthouse"];
  if (!unitTypes.includes(v.unitType)) throw new Error("bad unit type");
  if (!["urgent", "motivated", "flexible"].includes(v.motivation)) throw new Error("bad motivation");
  const originalPrice = money(v.originalPrice, { positive: true });
  const amountPaid = money(v.amountPaid);
  if (amountPaid > originalPrice) throw new Error("paid above the SPA price");
  if (!Number.isInteger(v.sizeSqft) || v.sizeSqft <= 0 || v.sizeSqft > INT_MAX) throw new Error("bad size");
  if (!Array.isArray(v.paymentPlan) || v.paymentPlan.length > 60) throw new Error("bad plan");
  const paymentPlan = v.paymentPlan.map((i) => ({
    label: str(i?.label, 60, true),
    dueDate: date(i?.dueDate ?? null),
    amount: money(i?.amount),
  }));
  return {
    projectName: str(v.projectName, 120, true),
    developer: str(v.developer, 80, true),
    community: str(v.community, 80, true),
    developerOther: str(v.developerOther, 80),
    communityOther: str(v.communityOther, 80),
    unitType: v.unitType,
    sizeSqft: v.sizeSqft,
    floor: str(v.floor, 40),
    view: str(v.view, 80),
    originalPrice,
    amountPaid,
    askingPrice: money(v.askingPrice),
    handoverDate: date(v.handoverDate ?? null),
    nextInstalmentDate: date(v.nextInstalmentDate ?? null),
    nextInstalmentAmount: v.nextInstalmentAmount == null ? null : money(v.nextInstalmentAmount),
    motivation: v.motivation,
    description: str(v.description, 3000),
    paymentPlan,
  };
}

/** Fetches the photos the listing doesn't have yet (by file name) and adds them to its gallery, in the file's order. */
async function ensurePhotos(pool, listingId, photos, uploaderId, sharp) {
  if (!photos.length) return 0;
  const { rows } = await pool.query("select filename from files where listing_id = $1 and kind = 'photo'", [listingId]);
  const have = new Set(rows.map((r) => r.filename));
  let added = 0;
  for (const p of photos) {
    if (!p?.filename || !p?.url || have.has(p.filename)) continue;
    let data;
    try {
      data = await fetchPhoto(p.url, sharp);
    } catch (err) {
      console.error(`[import] photo ${p.filename}: ${err?.message ?? err}`);
      continue;
    }
    if (!data) continue;
    const { rows: ins } = await pool.query(
      `insert into files (listing_id, uploader_id, kind, filename, mime_type, size, data)
       values ($1, $2, 'photo', $3, $4, $5, $6) returning id`,
      [listingId, uploaderId, p.filename.slice(0, 200), data.type, data.bytes.length, data.bytes],
    );
    await pool.query("update listings set images = array_append(images, $2) where id = $1", [listingId, `/api/files/${ins[0].id}`]);
    added++;
  }
  return added;
}

/** The photo, resized for the gallery when sharp is available; null when it is not an image or too big. */
async function fetchPhoto(url, sharp) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "user-agent": "OffplanDistress import" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!["image/webp", "image/jpeg", "image/png"].includes(type)) throw new Error(`not an image (${type || "no type"})`);
  const raw = Buffer.from(await res.arrayBuffer());
  if (sharp) {
    try {
      const bytes = await sharp(raw).rotate().resize({ width: PHOTO_WIDTH, height: PHOTO_WIDTH, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      return { bytes, type: "image/webp" };
    } catch (err) {
      console.error(`[import] resize failed, keeping the original: ${err?.message ?? err}`);
    }
  }
  if (raw.length > MAX_PHOTO_BYTES) return null;
  return { bytes: raw, type };
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    console.warn("[import] sharp isn't available — photos are stored as served, and those over 1.5 MB are skipped.");
    return null;
  }
}

/** One in-app notice per admin, so the team knows the units are waiting under "Imported — owner to add". */
async function tellAdmins(pool, source, created) {
  const { rows } = await pool.query("select id, coalesce(locale, 'en') as locale from users where role = 'admin'");
  for (const a of rows) {
    const ar = a.locale === "ar";
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.imported', $2, $3, '/admin?tab=imported')", [
      a.id,
      ar
        ? `تم استيراد ${created} إعلانًا من ${source.name}`
        : `${created} listings imported from ${source.name}`,
      ar
        ? "الإعلانات موجودة في تبويب «مستوردة — بانتظار تحديد المالك». لكل إعلان: حدّد المالك، ثم أكّد الملكية (رابط التأكيد أو نموذج A موقّع)، ثم أدخل تصريح الإعلان، ثم اعتمده."
        : "They're under the \"Imported — owner to add\" tab. For each one: set the owner, confirm ownership (claim link or signed Form A), enter the advertising permit, then approve.",
    ]);
  }
}
