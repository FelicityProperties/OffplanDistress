// Loads a partner network's units (scripts/partner-stock/*.json, the offplandistress-import/1 format with each photo's
// source URL instead of its bytes) into the database the way /admin/listings/import does — on the production build,
// where the database is reachable. Every listing is created in review, entered by staff, ownership not confirmed,
// under the network's placeholder owner (src/lib/import.ts), so nothing here is public until our team sets the owner,
// ownership is confirmed and the Trakheesi permit is in (src/app/actions/import.ts has the same rules). Runs again on
// every build: a unit already imported follows the file (syncListing: the network's changes applied unless our team
// edited the field, a unit marked "removed" withdrawn, one back on the site restored), photos still missing are fetched
// again, and the admins get one notice of what changed. The buyers and watchers the sync tells (an offer closed, a price
// cut) also get the email the app would send them (sendMail). One build imports at a time (takeLock).
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// PARTNER_STOCK_DIR: another folder of files, for a local test against a database copy.
const STOCK_DIR = process.env.PARTNER_STOCK_DIR || path.join(root, "scripts", "partner-stock");
const FORMAT = "offplandistress-import/1";
const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_WIDTH = 1024;
const FETCH_TIMEOUT_MS = 30_000;
const INT_MAX = 2_147_483_647;
/** The page's rules for a file (src/lib/import-format.ts IMPORT_KEY_RE, IMPORT_REF_RE, IMPORT_MAX_PHOTOS, IMPORT_MAX_NOTES). */
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const REF_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_PHOTOS = 6;
const MAX_NOTES = 4000;
/** The advisory lock a build holds while it imports (takeLock), and how long another build waits for it. */
const LOCK_NAME = "offplandistress:import-partner-stock";
const LOCK_WAIT_MS = 15 * 60_000;

export async function importPartnerStock(pool) {
  let names = [];
  try {
    // Beside each stock file: its permits (applyPermits), and the transcribed payment plans and curated photo order the
    // daily sync keeps (both already folded into the stock file).
    names = (await readdir(STOCK_DIR)).filter((n) => n.endsWith(".json") && !n.endsWith("-permits.json") && !n.endsWith("-plans.json") && !n.endsWith("-photos.json")).sort();
  } catch {
    return;
  }
  if (!names.length) return;
  const lock = await takeLock(pool);
  if (!lock) return;
  try {
    const sharp = await loadSharp();
    for (const name of names) {
      let doc;
      try {
        doc = JSON.parse(await readFile(path.join(STOCK_DIR, name), "utf8"));
      } catch (err) {
        console.error(`[import] ${name}: not readable`, err?.message ?? err);
        continue;
      }
      if (doc?.format !== FORMAT || !Array.isArray(doc.units)) {
        console.error(`[import] ${name}: not an ${FORMAT} file`);
        continue;
      }
      // The source as the page checks it (a key with capitals would name a placeholder owner the import can't find).
      const source = checkSource(doc.source);
      if (typeof source === "string") {
        console.error(`[import] ${name}: ${source} — nothing imported.`);
        continue;
      }
      await importSource(pool, { ...doc, source }, sharp);
    }
  } finally {
    // The emails once every notice of the run is stored, as the app sends them after its response; the lock's
    // connection is closed whatever happens (left open, it would keep the build from exiting).
    await sendMail(outbox.splice(0)).catch((err) => console.error("[import] the emails failed:", err?.message ?? err));
    await releaseLock(lock);
  }
}

/**
 * One build imports at a time: a session-level advisory lock, on a connection of its own (the build's pool has a single
 * connection, which the import itself needs), held until the run ends. A second production build started meanwhile
 * waits for the first rather than fetch and store the same new photos again; one that waits longer than LOCK_WAIT_MS
 * (or can't connect) skips the import, logged, and the next build imports.
 */
async function takeLock(pool) {
  const client = new pg.Client(pool.options);
  client.on("error", (err) => console.error("[import] the import lock's connection failed:", err?.message ?? err));
  try {
    await client.connect();
    const { rows } = await client.query("select pg_try_advisory_lock(hashtext($1)) as got", [LOCK_NAME]);
    if (!rows[0].got) {
      console.log("[import] Another build is importing the partner stock — waiting for it to finish.");
      await client.query(`set statement_timeout = ${LOCK_WAIT_MS}`);
      await client.query("select pg_advisory_lock(hashtext($1))", [LOCK_NAME]);
      await client.query("set statement_timeout = 0");
    }
    return client;
  } catch (err) {
    console.error("[import] Partner stock skipped: the import lock could not be taken —", err?.message ?? err);
    await client.end().catch(() => {});
    return null;
  }
}

async function releaseLock(client) {
  await client.query("select pg_advisory_unlock(hashtext($1))", [LOCK_NAME]).catch(() => {});
  await client.end().catch(() => {});
}

/** A web address as the page takes it (src/lib/import-format.ts webAddress), or null. */
function webAddress(v) {
  if (typeof v !== "string" || v.length > 500) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

/** The file's source by the page's rules (src/lib/import-format.ts checkImportSource), or why it can't be imported. */
function checkSource(v) {
  const key = typeof v?.key === "string" ? v.key.trim() : "";
  const name = typeof v?.name === "string" ? v.name.trim() : "";
  if (!KEY_RE.test(key)) return `the source key "${key}" must be 1–40 lowercase letters, digits and dashes, starting with a letter or digit`;
  if (name.length < 1 || name.length > 80) return "the source needs a name of 1–80 characters";
  if (v.url != null && v.url !== "" && !webAddress(v.url)) return "the source's url is not a web address";
  return { key, name, url: v.url || null };
}

/**
 * Why a unit can't be imported by the page's rules (checkUnitMeta, checkPhotos), or null: its ref (once per file: the
 * ref is the unit), a web address, a posting day, notes, at most MAX_PHOTOS photos, each with a name and a url, the
 * names different before the extension (the import knows a listing's photos by name).
 */
function unitProblem(unit, refs) {
  if (!unit || typeof unit !== "object" || Array.isArray(unit)) return "not a unit";
  if (typeof unit.ref !== "string" || !REF_RE.test(unit.ref)) return "no ref, or one other than 1–64 letters, digits, dots, dashes and underscores";
  if (refs.has(unit.ref)) return "the same ref twice in the file";
  refs.add(unit.ref);
  if (unit.url != null && unit.url !== "" && !webAddress(unit.url)) return "url not a web address";
  if (unit.posted != null && !isoDay(unit.posted)) return "bad posted date";
  if (unit.notes != null && (typeof unit.notes !== "string" || unit.notes.trim().length > MAX_NOTES)) return `notes not text of at most ${MAX_NOTES} characters`;
  const photos = unit.photos ?? [];
  if (!Array.isArray(photos)) return "photos not a list";
  if (photos.length > MAX_PHOTOS) return `more than ${MAX_PHOTOS} photos`;
  const stems = [];
  for (const [i, p] of photos.entries()) {
    if (typeof p?.filename !== "string" || !p.filename.trim() || p.filename.length > 200 || typeof p.url !== "string" || !p.url) {
      return `photo ${i + 1} needs a filename (at most 200 characters) and a url`;
    }
    const stem = (p.filename.replace(/\.[^.]+$/, "") || "photo").toLowerCase();
    if (stems.includes(stem)) return `photo ${i + 1} has the same name as photo ${stems.indexOf(stem) + 1} (before the extension)`;
    stems.push(stem);
  }
  return null;
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
  const report = { updated: [], withdrawn: [], restored: [], conflicts: [], deals: [], valve: 0, failed: [] };
  const removed = [];
  const refs = new Set();
  for (const unit of units) {
    const ref = typeof unit?.ref === "string" && unit.ref ? unit.ref : "?";
    try {
      const problem = unitProblem(unit, refs);
      if (problem) throw new Error(problem);
      // A unit the network no longer lists ("removed": the day it went) is withdrawn below, all at once (the valve).
      if (unit.removed != null) {
        if (!isoDay(unit.removed)) throw new Error("bad removed date");
        removed.push(unit);
        continue;
      }
      const { id, isNew } = await ensureListing(pool, source, unit, ownerId, actor);
      if (isNew) {
        created++;
        photos += await ensurePhotos(pool, id, unit.photos ?? [], actor ?? ownerId, sharp);
        // A new unit's gallery snapshot is the gallery as just imported (syncListing compares against it from the next build on).
        await pool.query("update listings set source = jsonb_set(source, '{synced,images}', to_jsonb(images)) where id = $1", [id]);
      } else photos += await syncListing(pool, unit, id, actor, actor ?? ownerId, report, sharp);
    } catch (err) {
      report.failed.push(ref);
      console.error(`[import] ${source.name} ${ref}: failed`, err?.message ?? err);
    }
  }
  await withdrawRemoved(pool, source, removed, doc.sync?.allowMassRemoval === true, actor, report);
  console.log(`[import] ${source.name}: ${created} listings created, ${photos} photos added, ${report.failed.length} failed (${units.length} in the file).`);
  console.log(
    `[sync] ${source.name}: ${report.updated.length} updated, ${report.withdrawn.length} withdrawn, ${report.restored.length} restored, ` +
      `${report.conflicts.length} edited by our team (left), ${report.deals.length} deals in progress (left)` +
      `${report.valve ? `, VALVE TRIPPED: ${report.valve} removals, nothing withdrawn` : ""}.`,
  );
  if (created) await tellAdmins(pool, source, created);
  // Failed units too: the build log is the only other place that says why a unit never appears.
  if (report.updated.length || report.withdrawn.length || report.restored.length || report.conflicts.length || report.deals.length || report.valve || report.failed.length) {
    await tellAdminsSynced(pool, source, { created, ...report });
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
  images: "images",
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
 * The gallery follows the file's photo order the same way (galleryOrder): applied while the array is still the import's
 * own or as the last sync left it (source.synced.images), else our team's arrangement stands, a conflict like a field's.
 * Photos the file has and the listing lacks are added only where the sync may change the unit: fetched before the
 * transaction (the network can be slow), stored once the checks pass under the lock. Returns how many were added.
 */
async function syncListing(pool, unit, id, actor, uploader, report, sharp) {
  const wanted = valuesOf(checkListing(unit.listing));
  const photos = unit.photos ?? [];
  const fetched = (await mayChange(pool, id)) ? await fetchMissing(pool, id, photos, sharp) : [];
  // The notices' emails, queued once the transaction commits (sendMail).
  const mail = [];
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `select id, ref_no, status, is_sample, seller_id, project_name, asking_price, public_price, original_price, amount_paid,
              next_instalment_date, next_instalment_amount, payment_plan, handover_date, size_sqft, floor, view, description, images,
              dld_permit, dld_permit_expires_at, form_a_expires_at, permit_attested_at, created_by_staff, ownership_confirmed_at, source
       from listings where id = $1 for update`,
      [id],
    );
    const row = rows[0];
    if (!row || row.is_sample) {
      await client.query("rollback");
      return 0;
    }
    const code = refCode(row.ref_no);
    const src = row.source ?? {};
    const state = { ...(src.sync ?? {}) };
    const have = valuesOf(row);
    let gallery = await galleryOrder(client, id, row.images ?? [], photos, uploader, src.synced?.images);
    // What the file would change: the fields, the gallery's order, photos the listing doesn't have yet.
    const lacking = await missingPhotos(client, id, photos);
    const changed = [...SYNCED_FIELDS.filter((f) => !same(wanted[f], have[f])), ...(gallery.changed || lacking.length ? ["images"] : [])];
    const now = new Date();
    const today = dubaiToday();
    let status = row.status;
    const restoring = status === "withdrawn" && state.removedAt != null;
    if (!restoring && !LISTED.includes(status)) {
      if (DEAL_STATUSES.includes(status) && changed.length) report.deals.push({ code, status, fields: changed });
      await client.query("rollback");
      return 0;
    }
    if (await dealInProgress(client, id)) {
      if (restoring || changed.length) report.deals.push({ code, status, fields: changed, back: restoring });
      await client.query("rollback");
      return 0;
    }
    // The new photos, appended to the gallery; then the gallery against the file again.
    const added = await storePhotos(client, id, fetched, uploader);
    if (added.length) {
      row.images = [...(row.images ?? []), ...added];
      gallery = await galleryOrder(client, id, row.images, photos, uploader, src.synced?.images);
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
      if (live && row.public_price != null) await tellWatchers(client, row, row.public_price, row.asking_price, mail);
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
    // The gallery: the file's photos in its order, the other entries (older import photos, anything our team added)
    // after them as they are — nothing dropped — while the array is still ours; else their arrangement stands.
    let syncedImages;
    if (!gallery.changed) syncedImages = gallery.current;
    else if (gallery.ours) {
      diff.images = [gallery.current, gallery.desired];
      syncedImages = gallery.desired;
    } else {
      conflicts.images = gallery.desired;
      syncedImages = gallery.snapshot;
    }
    const fields = Object.keys(diff);
    if (fields.length) {
      // The advertised price follows the asking price while the public sees the advert (src/lib/permits.ts isAdvertised).
      const advertised = PUBLIC_STATUSES.includes(status) && !permitLapsed(row, today);
      const sets = fields.map((f, i) => `${COLUMNS[f]} = $${i + 2}`);
      const params = [id, ...fields.map((f) => (f === "images" ? gallery.desired : f === "paymentPlan" ? JSON.stringify(wanted[f]) : wanted[f]))];
      if (diff.askingPrice && advertised) {
        diff.publicPrice = [row.public_price, wanted.askingPrice];
        sets.push(`public_price = $${params.push(wanted.askingPrice)}`);
      }
      await client.query(`update listings set ${sets.join(", ")}, updated_at = $${params.push(now)} where id = $1`, params);
      // Its own action, so History tells the network's changes from our team's edits (listing.update).
      await auditRow(client, actor, "listing.sync_update", id, diff);
      if (diff.askingPrice && advertised) await tellWatchers(client, row, row.public_price ?? row.asking_price, wanted.askingPrice, mail);
      report.updated.push({ code, fields });
    }
    // Conflicts: told once, until the network changes the field again; forgotten once the two agree.
    const told = state.conflicts ?? {};
    const fresh = Object.keys(conflicts).filter((f) => !(f in told) || !same(told[f], conflicts[f]));
    if (fresh.length) report.conflicts.push({ code, fields: fresh });
    if (Object.keys(conflicts).length) state.conflicts = conflicts;
    else delete state.conflicts;
    // The snapshot and the sync's own state, written when either changed (so a build that changes nothing writes nothing).
    const next = { ...src, synced: { ...synced, images: syncedImages ?? null, syncedAt: now.toISOString() } };
    if (Object.keys(state).length) next.sync = state;
    else delete next.sync;
    if (!src.synced || !same(valuesOf(src.synced), synced) || !same(src.synced.images ?? null, syncedImages ?? null) || !same(src.sync ?? null, next.sync ?? null)) {
      await client.query("update listings set source = $2 where id = $1", [id, JSON.stringify(next)]);
    }
    await client.query("commit");
    outbox.push(...mail);
    return added.length;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Whether syncListing may change the unit (as its checks under the lock will find): in review, live or paused, or withdrawn by an earlier build, and no deal in progress. */
async function mayChange(pool, id) {
  const { rows } = await pool.query("select status, is_sample, source->'sync'->>'removedAt' as removed_at from listings where id = $1", [id]);
  const r = rows[0];
  if (!r || r.is_sample || !(LISTED.includes(r.status) || (r.status === "withdrawn" && r.removed_at != null))) return false;
  return !(await dealInProgress(pool, id));
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
    const { rows } = await pool.query("select id, ref_no, status, source from listings where source->>'import' = $1 and source->>'ref' = $2 and not is_sample limit 1", [
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
    const mail = [];
    await tellBuyers(client, closed, row.project_name, mail);
    await client.query("commit");
    outbox.push(...mail);
    report.withdrawn.push({ code });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// The notices the app would send (src/lib/notify.ts, with the copy of src/lib/notification-templates.ts), each in the
// recipient's language (English, Arabic or Chinese); the buyers' and watchers' also by email (sendMail), the admins'
// reports in-app only.
const numberFmt = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });
/** src/lib/format.ts formatAED: "AED 1,250,000", "1,250,000 درهم". */
const aed = (n, lang) => (lang === "ar" ? `${numberFmt.format(n)} درهم` : `AED ${numberFmt.format(n)}`);
const langOf = (locale) => (locale === "ar" || locale === "zh" ? locale : "en");
const fillIn = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : String(vars[k])));

/** offer.unit_unavailable and watch.price_drop as src/lib/notification-templates.ts words them, with the email's button. */
const TEMPLATES = {
  "offer.unit_unavailable": {
    en: { title: "{project} is no longer available", body: "The unit is no longer available, so your offer of {amount} was closed.", cta: "Browse deals" },
    ar: { title: "لم تعد الوحدة في {project} متاحة", body: "لم تعد الوحدة متاحة، لذلك أُغلق عرضك البالغ {amount}.", cta: "تصفّح الصفقات" },
    zh: { title: "{project} 已不再可售", body: "该单元已不再可售，您 {amount} 的报价已关闭。", cta: "浏览房源" },
  },
  // It advertises the unit, so it carries what every advert carries: the deal's permit line, our office's ORN and the
  // broker's BRN (permitLine, advertiserLines).
  "watch.price_drop": {
    en: { title: "Price drop on {project}", body: "The asking price fell from {from} to {to}.\n\n{permit}\n{advertiser}", cta: "View deal" },
    ar: { title: "انخفاض سعر {project}", body: "انخفض السعر المطلوب من {from} إلى {to}.\n\n{permit}\n{advertiser}", cta: "عرض الصفقة" },
    zh: { title: "{project} 已降价", body: "卖家要价已从 {from} 降至 {to}。\n\n{permit}\n{advertiser}", cta: "查看房源" },
  },
};
const render = (key, lang, vars) => {
  const copy = TEMPLATES[key][lang];
  return { title: fillIn(copy.title, vars), body: fillIn(copy.body, vars).trim(), cta: copy.cta };
};

/** Our licence details (src/lib/config.ts BRAND, the same NEXT_PUBLIC_* overrides), in Arabic on Arabic copy. */
const LICENCE = {
  company: { en: "Felicity Properties L.L.C", ar: "فيليسيتي للعقارات ش.ذ.م.م" },
  orn: process.env.NEXT_PUBLIC_RERA_ORN || "33951",
  broker: {
    en: process.env.NEXT_PUBLIC_BROKER_NAME || "Muhannad Al Nwilati Al Masri",
    ar: process.env.NEXT_PUBLIC_BROKER_NAME_AR || process.env.NEXT_PUBLIC_BROKER_NAME || "مهند النويلاتي المصري",
  },
  brn: process.env.NEXT_PUBLIC_BROKER_BRN || "59244",
};
/** src/i18n/messages/deal.ts listedBy.office, listedBy.broker, listedBy.permit, listedBy.permitHeld. */
const LISTED_BY = {
  en: {
    office: "{company} · RERA ORN {orn}",
    broker: "Broker: {name} · BRN {brn}",
    permit: "DLD advertising permit No. {permit}",
    permitHeld: "DLD advertising permit held by {company} (RERA ORN {orn}) — number available from the broker.",
  },
  ar: {
    office: "{company} · رقم تسجيل المكتب لدى ريرا {orn}",
    broker: "الوسيط: {name} · رقم الوسيط {brn}",
    permit: "رقم تصريح الإعلان من دائرة الأراضي والأملاك {permit}",
    permitHeld: "تصريح الإعلان من دائرة الأراضي والأملاك محفوظ لدى {company} (رقم تسجيل المكتب لدى ريرا ⁨{orn}⁩) — ويمكن الحصول على رقمه من الوسيط.",
  },
  zh: {
    office: "{company} · 经纪公司注册号（ORN）{orn}",
    broker: "经纪人：{name} · 经纪人注册号（BRN）{brn}",
    permit: "迪拜土地局广告许可编号 {permit}",
    permitHeld: "迪拜土地局广告许可由 {company}（RERA 经纪公司注册号 ORN {orn}）持有——许可编号可向经纪人索取。",
  },
};
const companyIn = (lang) => (lang === "ar" ? LICENCE.company.ar : LICENCE.company.en);
/** The advert's RERA line (src/lib/notification-templates.ts permitLine): its permit, the one our office holds, or our office. */
function permitLine(row, lang) {
  const t = LISTED_BY[lang];
  if (row.dld_permit) return fillIn(t.permit, { permit: row.dld_permit });
  return fillIn(row.permit_attested_at ? t.permitHeld : t.office, { company: companyIn(lang), orn: LICENCE.orn });
}
/** Our office with its ORN, then the broker with their BRN (advertiserLines). */
const advertiserLines = (lang) =>
  `${fillIn(LISTED_BY[lang].office, { company: companyIn(lang), orn: LICENCE.orn })}\n` +
  fillIn(LISTED_BY[lang].broker, { name: lang === "ar" ? LICENCE.broker.ar : LICENCE.broker.en, brn: LICENCE.brn });

/** offer.unit_unavailable, to each buyer whose offer was just closed; their emails go into `mail`. */
async function tellBuyers(client, closed, project, mail) {
  if (!closed.length) return;
  const { rows: users } = await client.query("select id, email, coalesce(locale, 'en') as locale from users where id = any($1)", [closed.map((o) => o.buyer_id)]);
  for (const o of closed) {
    const user = users.find((u) => u.id === o.buyer_id);
    const lang = langOf(user?.locale);
    const msg = render("offer.unit_unavailable", lang, { project, amount: aed(o.amount, lang) });
    await client.query("insert into notifications (user_id, type, title, body, href) values ($1, 'offer.unit_unavailable', $2, $3, '/deals')", [o.buyer_id, msg.title, msg.body]);
    if (user) mail.push({ to: user.email, lang, ...msg, href: "/deals" });
  }
}

/** watch.price_drop, to everyone watching the deal but its seller, when the asking price fell (notifyPriceDrop); emails into `mail`. */
async function tellWatchers(client, row, from, to, mail) {
  if (!(to < from)) return;
  const { rows } = await client.query(
    "select w.user_id, u.email, coalesce(u.locale, 'en') as locale from watchlist w join users u on u.id = w.user_id where w.listing_id = $1 and w.user_id <> $2",
    [row.id, row.seller_id],
  );
  const href = `/deals/${refCode(row.ref_no)}`;
  for (const w of rows) {
    const lang = langOf(w.locale);
    const msg = render("watch.price_drop", lang, { project: row.project_name, from: aed(from, lang), to: aed(to, lang), permit: permitLine(row, lang), advertiser: advertiserLines(lang) });
    await client.query("insert into notifications (user_id, type, title, body, href) values ($1, 'watch.price_drop', $2, $3, $4)", [w.user_id, msg.title, msg.body, href]);
    mail.push({ to: w.email, lang, ...msg, href });
  }
}

const plurals = { en: new Intl.PluralRules("en"), ar: new Intl.PluralRules("ar") };
/**
 * A count with its noun in the form the number takes: English one / other; Arabic one, two, 3–10, 11–99 and the rest,
 * as the genitive after a verbal noun ("تم استيراد إعلانين"). `nouns` = [singular, plural] for English, [one, two, few,
 * many, other] for Arabic.
 */
function counted(lang, n, nouns) {
  if (lang !== "ar") return `${n} ${plurals.en.select(n) === "one" ? nouns[0] : nouns[1]}`;
  const [one, two, few, many, other] = nouns;
  return { one, two, few: `${n} ${few}`, many: `${n} ${many}` }[plurals.ar.select(n)] ?? `${n} ${other}`;
}
const NOUNS = {
  listings: { en: ["listing", "listings"], ar: ["إعلان واحد", "إعلانين", "إعلانات", "إعلانًا", "إعلان"] },
  units: { en: ["unit", "units"], ar: ["وحدة واحدة", "وحدتين", "وحدات", "وحدةً", "وحدة"] },
  removals: { ar: ["إزالة واحدة", "إزالتين", "إزالات", "إزالةً", "إزالة"] },
};

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
    images: "photos",
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
    images: "الصور",
  },
  zh: {
    askingPrice: "卖家要价",
    originalPrice: "原始合同价",
    amountPaid: "已付开发商金额",
    nextInstalmentDate: "下一期分期款日期",
    nextInstalmentAmount: "下一期分期款金额",
    paymentPlan: "付款计划",
    handoverDate: "交房",
    sizeSqft: "面积",
    floor: "楼层",
    view: "景观",
    description: "描述",
    images: "照片",
  },
};
/** The statuses' names (src/i18n/messages/common.ts). */
const STATUS_LABELS = {
  en: { pending_review: "Under review", live: "Live", under_offer: "Offer accepted", noc_in_progress: "NOC in progress", paused: "Paused" },
  ar: { pending_review: "قيد المراجعة", live: "منشور", under_offer: "تم قبول عرض", noc_in_progress: "قيد إصدار شهادة عدم الممانعة", paused: "متوقف مؤقتاً" },
  zh: { pending_review: "审核中", live: "在售", under_offer: "已接受报价", noc_in_progress: "无异议函（NOC）办理中", paused: "已暂停" },
};

/** One in-app notice per admin with what the sync did, in their language (the build log names every unit). */
async function tellAdminsSynced(pool, source, r) {
  const { rows } = await pool.query("select id, coalesce(locale, 'en') as locale from users where role = 'admin'");
  for (const a of rows) {
    const { title, body } = syncNotice(source, r, langOf(a.locale));
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.synced', $2, $3, '/admin?tab=imported')", [a.id, title, body]);
  }
}

/** The report's wording in each language: list separators, "and N more", a unit with what changed, each line. */
const SYNC_COPY = {
  en: {
    sep: ", ",
    more: (n) => `, and ${n} more`,
    item: (code, ...what) => `${code} (${what.join("; ")})`,
    end: ".",
    counts: (r) => `Created ${r.created}, updated ${r.updated.length}, withdrawn ${r.withdrawn.length}, restored ${r.restored.length}.`,
    updated: () => "Updated from the source: ",
    withdrawn: (name) => `Withdrawn, no longer on ${name}: `,
    restored: (name) => `Back on ${name}, restored: `,
    conflicts: () => "Changed on the source but edited by our team since the last sync, so left as they are: ",
    deals: () => "Deals in progress, left alone: ",
    removed: "removed from the source",
    back: "back on the source",
    valve: (n) => `Sync valve tripped: ${n} removals, nothing withdrawn — check the manifest.`,
    failed: (n, refs) => `${counted("en", n, NOUNS.units.en)} failed (${refs}) — see the build log.`,
    title: (name, r) => `${name} sync: ${r.updated.length} updated, ${r.withdrawn.length} withdrawn, ${r.restored.length} restored${r.failed.length ? `, ${r.failed.length} failed` : ""}`,
    valveTitle: (name) => `${name} sync: valve tripped, nothing withdrawn`,
  },
  ar: {
    sep: "، ",
    more: (n) => `، و${n} أخرى`,
    item: (code, ...what) => `${code} (${what.join("; ")})`,
    end: ".",
    counts: (r) => `أُنشئ ${r.created}، حُدّث ${r.updated.length}، سُحب ${r.withdrawn.length}، أُعيد ${r.restored.length}.`,
    updated: () => "حُدّثت من المصدر: ",
    withdrawn: (name) => `سُحبت لأنها لم تعد معروضة على ${name}: `,
    restored: (name) => `عادت إلى ${name} فأُعيدت: `,
    conflicts: () => "تغيّرت على المصدر لكن فريقنا عدّلها منذ آخر مزامنة، فتُركت كما هي: ",
    deals: () => "صفقات جارية تُركت كما هي: ",
    removed: "أُزيلت من المصدر",
    back: "عادت إلى المصدر",
    valve: (n) => `توقّف صمام أمان المزامنة: ${counted("ar", n, NOUNS.removals.ar)}، لم يُسحب شيء — راجع ملف المخزون.`,
    failed: (n, refs) => `فشل استيراد ${counted("ar", n, NOUNS.units.ar)} (${refs}) — راجع سجل البناء.`,
    title: (name, r) => `مزامنة ${name}: ${r.updated.length} حُدّث، ${r.withdrawn.length} سُحب، ${r.restored.length} أُعيد${r.failed.length ? `، ${r.failed.length} فشل` : ""}`,
    valveTitle: (name) => `مزامنة ${name}: توقّف صمام الأمان، لم يُسحب شيء`,
  },
  zh: {
    sep: "、",
    more: (n) => `，另有 ${n} 项`,
    item: (code, ...what) => `${code}（${what.join("；")}）`,
    end: "。",
    counts: (r) => `新建 ${r.created}，更新 ${r.updated.length}，撤回 ${r.withdrawn.length}，恢复 ${r.restored.length}。`,
    updated: () => "已按来源更新：",
    withdrawn: (name) => `已不在 ${name} 上，已撤回：`,
    restored: (name) => `重新出现在 ${name} 上，已恢复：`,
    conflicts: () => "来源有变动，但我方团队自上次同步后已修改，故保持不变：",
    deals: () => "交易进行中，未作改动：",
    removed: "已从来源移除",
    back: "重新出现在来源上",
    valve: (n) => `同步安全阀已触发：${n} 项移除，未撤回任何房源——请检查房源清单文件。`,
    failed: (n, refs) => `${n} 个单元导入失败（${refs}）——请查看构建日志。`,
    title: (name, r) => `${name} 同步：更新 ${r.updated.length}，撤回 ${r.withdrawn.length}，恢复 ${r.restored.length}${r.failed.length ? `，失败 ${r.failed.length}` : ""}`,
    valveTitle: (name) => `${name} 同步：安全阀已触发，未撤回任何房源`,
  },
};

function syncNotice(source, r, lang) {
  const t = SYNC_COPY[lang];
  const list = (items) => {
    const more = Math.max(items.length - 25, 0);
    return items.slice(0, 25).join(t.sep) + (more ? t.more(more) : "");
  };
  const fields = (fs) => fs.map((f) => FIELD_LABELS[lang][f] ?? f).join(t.sep);
  const status = (s) => STATUS_LABELS[lang][s] ?? s;
  const change = (d) => (d.removed ? t.removed : d.back ? t.back : fields(d.fields));
  const lines = [t.counts(r)];
  if (r.updated.length) lines.push(`${t.updated()}${list(r.updated.map((u) => t.item(u.code, fields(u.fields))))}${t.end}`);
  if (r.withdrawn.length) lines.push(`${t.withdrawn(source.name)}${list(r.withdrawn.map((w) => w.code))}${t.end}`);
  if (r.restored.length) lines.push(`${t.restored(source.name)}${list(r.restored.map((x) => t.item(x.code, status(x.status))))}${t.end}`);
  if (r.conflicts.length) lines.push(`${t.conflicts()}${list(r.conflicts.map((c) => t.item(c.code, fields(c.fields))))}${t.end}`);
  if (r.deals.length) lines.push(`${t.deals()}${list(r.deals.map((d) => t.item(d.code, status(d.status), change(d))))}${t.end}`);
  if (r.valve) lines.push(t.valve(r.valve));
  // The units of the file that failed, by the network's ref (the build log says why).
  if (r.failed.length) lines.push(t.failed(r.failed.length, list(r.failed)));
  return { title: r.valve ? t.valveTitle(source.name) : t.title(source.name, r), body: lines.join("\n") };
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
    const { title, body } = liveNotice(source, live, langOf(a.locale));
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.imported_live', $2, $3, '/deals')", [a.id, title, body]);
  }
}

/** listing.imported_live in each language, the count in its form. */
function liveNotice(source, n, lang) {
  if (lang === "ar") {
    return {
      title: `تم نشر ${counted("ar", n, NOUNS.listings.ar)} من ${source.name}`,
      body:
        n === 1
          ? "نُشر بتصريح الإعلان المسجّل. يبقى تحديد المالك الفعلي من بطاقة «المالك» في صفحته."
          : "نُشرت بتصاريح الإعلان المسجّلة. يبقى تحديد المالك الفعلي لكل إعلان من بطاقة «المالك» في صفحته.",
    };
  }
  if (lang === "zh") {
    return { title: `${source.name} 的 ${n} 套房源现已在售`, body: "房源已凭存档的广告许可发布，真实业主仍需在其页面的“业主”卡片中录入。" };
  }
  return {
    title: n === 1 ? `1 listing from ${source.name} is now live` : `${n} listings from ${source.name} are now live`,
    body:
      n === 1
        ? "It was published with the advertising permit on file. Its real owner still gets entered from the Owner card on its page."
        : "They were published with the advertising permits on file. The real owner of each still gets entered from the Owner card on its page.",
  };
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
  const { rows } = await pool.query("select id, role, password_hash from users where lower(email) = lower($1)", [email]);
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

/**
 * The listing's gallery against the file: desired = the file's photos (by name, through the files table) in its order,
 * then the array's other entries as they are — older import photos the file dropped, anything our team added by hand;
 * nothing is removed, only ordered. The array is "ours" (the order may be applied) while it is as the last sync left it
 * (the snapshot, source.synced.images) but for this unit's import photos added since: the entries it shares with the
 * snapshot in the snapshot's order, every other one a file the import uploaded under one of the unit's photo names.
 * One our team rearranged since, or put a photo of their own into (their uploads are filed under the uploading admin,
 * who may be the import's actor), is theirs. A row without a snapshot is ours while every entry is such an import photo.
 */
async function galleryOrder(client, listingId, current, photos, uploaderId, snapshot) {
  const { rows } = await client.query("select id, filename, uploader_id from files where listing_id = $1 and kind = 'photo' order by created_at, id", [listingId]);
  const byName = new Map();
  for (const f of rows) if (!byName.has(f.filename)) byName.set(f.filename, `/api/files/${f.id}`);
  const names = new Set(photos.map((p) => p?.filename));
  const imported = new Set(rows.filter((f) => f.uploader_id === uploaderId && names.has(f.filename)).map((f) => `/api/files/${f.id}`));
  // Each photo once, even from a file that named one twice.
  const first = [...new Set(photos.map((p) => byName.get(p?.filename)).filter((u) => u && current.includes(u)))];
  const rest = [...current];
  for (const u of first) {
    const i = rest.indexOf(u);
    if (i >= 0) rest.splice(i, 1);
  }
  const desired = [...first, ...rest];
  const snap = Array.isArray(snapshot) ? snapshot : null;
  const ours = snap
    ? same(
        current.filter((u) => snap.includes(u)),
        snap.filter((u) => current.includes(u)),
      ) && current.every((u) => snap.includes(u) || imported.has(u))
    : current.every((u) => imported.has(u));
  return { current, desired, changed: !same(desired, current), ours, snapshot: snap };
}

/** A new unit's photos: fetched and added to its gallery, in the file's order; returns how many. */
async function ensurePhotos(pool, listingId, photos, uploaderId, sharp) {
  return (await storePhotos(pool, listingId, await fetchMissing(pool, listingId, photos, sharp), uploaderId)).length;
}

/** The file's photos the listing has no file of (by name). */
async function missingPhotos(db, listingId, photos) {
  const { rows } = await db.query("select filename from files where listing_id = $1 and kind = 'photo'", [listingId]);
  const have = new Set(rows.map((r) => r.filename));
  return photos.filter((p) => p?.filename && p?.url && !have.has(p.filename));
}

/** Those photos fetched (and resized): [{ filename, data }]. One that fails is logged and left for the next build. */
async function fetchMissing(db, listingId, photos, sharp) {
  const out = [];
  for (const p of photos.length ? await missingPhotos(db, listingId, photos) : []) {
    if (out.some((f) => f.filename === p.filename)) continue;
    try {
      const data = await fetchPhoto(p.url, sharp);
      if (data) out.push({ filename: p.filename, data });
    } catch (err) {
      console.error(`[import] photo ${p.filename}: ${err?.message ?? err}`);
    }
  }
  return out;
}

/** Stores the fetched photos the listing still has no file of and appends them to its gallery; returns their urls. */
async function storePhotos(db, listingId, fetched, uploaderId) {
  if (!fetched.length) return [];
  const { rows } = await db.query("select filename from files where listing_id = $1 and kind = 'photo'", [listingId]);
  const have = new Set(rows.map((r) => r.filename));
  const urls = [];
  for (const { filename, data } of fetched) {
    if (have.has(filename)) continue;
    have.add(filename);
    const { rows: ins } = await db.query(
      `insert into files (listing_id, uploader_id, kind, filename, mime_type, size, data)
       values ($1, $2, 'photo', $3, $4, $5, $6) returning id`,
      [listingId, uploaderId, filename.slice(0, 200), data.type, data.bytes.length, data.bytes],
    );
    const url = `/api/files/${ins[0].id}`;
    await db.query("update listings set images = array_append(images, $2) where id = $1", [listingId, url]);
    urls.push(url);
  }
  return urls;
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
    const { title, body } = importedNotice(source, created, langOf(a.locale));
    await pool.query("insert into notifications (user_id, type, title, body, href) values ($1, 'listing.imported', $2, $3, '/admin?tab=imported')", [a.id, title, body]);
  }
}

/** listing.imported in each language, the count in its form (the tab's name as src/i18n/messages/intake.ts has it). */
function importedNotice(source, n, lang) {
  if (lang === "ar") {
    return {
      title: `تم استيراد ${counted("ar", n, NOUNS.listings.ar)} من ${source.name}`,
      body:
        n === 1
          ? "الإعلان موجود في تبويب «مستوردة — بانتظار تحديد المالك»: حدّد المالك، ثم أكّد الملكية (رابط التأكيد أو نموذج A موقّع)، ثم أدخل تصريح الإعلان، ثم اعتمده."
          : "الإعلانات موجودة في تبويب «مستوردة — بانتظار تحديد المالك». لكل إعلان: حدّد المالك، ثم أكّد الملكية (رابط التأكيد أو نموذج A موقّع)، ثم أدخل تصريح الإعلان، ثم اعتمده.",
    };
  }
  if (lang === "zh") {
    return {
      title: `已从 ${source.name} 导入 ${n} 套房源`,
      body: "房源位于“已导入——待添加业主”标签页。请为每套房源设置业主、确认所有权（确认链接或业主签署的 A 表）、填写广告许可，然后批准。",
    };
  }
  return {
    title: `${counted("en", n, NOUNS.listings.en)} imported from ${source.name}`,
    body:
      n === 1
        ? "It's under the \"Imported — owner to add\" tab: set the owner, confirm ownership (claim link or signed Form A), enter the advertising permit, then approve."
        : "They're under the \"Imported — owner to add\" tab. For each one: set the owner, confirm ownership (claim link or signed Form A), enter the advertising permit, then approve.",
  };
}

// ——— Email: the buyers' and watchers' notices, as src/lib/notify.ts and src/lib/email.ts send the app's ——————————————
// Each in the recipient's language with a button to the page in that language, never to a .invalid address, once the
// run's notices are stored. Off without RESEND_API_KEY; a production build also needs EMAIL_FROM on our own domain
// (from Resend's test sender only the owner logins get theirs), as the app does. Never fails the build.

/** The run's emails, queued as each transaction commits and sent at the end of importPartnerStock. */
const outbox = [];
const TEST_SENDER = "onboarding@resend.dev";
const EMAIL_BATCH = 100;
const EMAIL_GAP_MS = 600;
const EMAIL_TIMEOUT_MS = 10_000;
/** src/i18n/messages/common.ts "location", under the company's name in the footer. */
const LOCATION = { en: "Dubai, United Arab Emirates", ar: "دبي، الإمارات العربية المتحدة", zh: "阿联酋迪拜" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** EMAIL_FROM as Resend gets it (src/lib/email.ts senderFrom): trimmed, without outer quotes or a trailing ";". */
function senderFrom() {
  let from = (process.env.EMAIL_FROM ?? "").trim();
  for (let i = 0; i < 2; i++) {
    from = from.replace(/;+$/, "").trim();
    const q = /^(["'“”‘’])([\s\S]*)(["'“”‘’])$/.exec(from);
    if (q) from = q[2].trim();
  }
  return from;
}

/** The address in EMAIL_FROM, lower-cased, or null (src/lib/email.ts senderAddress). */
function senderAddress() {
  const from = senderFrom();
  const address = (/<([^<>]+)>\s*$/.exec(from)?.[1] ?? from).trim().toLowerCase();
  return /^[^\s@<>"'“”;,]+@[^\s@<>"'“”;,]+\.[^\s@<>"'“”;,]+$/.test(address) ? address : null;
}

/** The site's address for the links (src/lib/site-url.ts siteUrl). */
function siteUrl() {
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (url.hostname.includes(".") || url.hostname === "localhost") return url.origin;
    } catch {}
  }
  return "http://localhost:3000";
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** The app's email layout (src/lib/email.ts render): the wordmark, the heading, the body, the button, our company's line. */
function emailHtml({ lang, title, body, cta }, href) {
  const fonts = lang === "zh" ? "Inter,PingFang SC,Hiragino Sans GB,Microsoft YaHei,Noto Sans CJK SC,Segoe UI,Arial,sans-serif" : "Inter,Segoe UI,Arial,sans-serif";
  return `<!doctype html><html dir="${lang === "ar" ? "rtl" : "ltr"}" lang="${lang === "zh" ? "zh-CN" : lang}"><body style="margin:0;background:#faf8f3;font-family:${fonts};color:#141c33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ebe6dc;border-radius:14px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #ebe6dc;font-family:Georgia,serif;font-size:20px;font-weight:600" dir="ltr">Offplan<span style="font-weight:400;opacity:.8">Distress</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.35">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5068;white-space:pre-line">${escapeHtml(body)}</p>
<a href="${escapeHtml(href)}" style="display:inline-block;background:#141c33;color:#faf8f3;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">${escapeHtml(cta)}</a>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #ebe6dc;font-size:12px;color:#8a8fa3">${escapeHtml(LICENCE.company.en)} · ${escapeHtml(LOCATION[lang])}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Sends the queued emails through Resend's API in batches (src/lib/email.ts sendEmail's rules); logs, never throws. */
async function sendMail(mail) {
  const due = mail.filter((m) => typeof m.to === "string" && m.to && !m.to.trim().toLowerCase().endsWith(".invalid"));
  if (!due.length) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[import] RESEND_API_KEY not set — ${due.length} email(s) not sent (the in-app notices are stored).`);
    return;
  }
  // Production needs a sender on our own domain: from Resend's test sender only the owner logins (ADMIN_EMAILS) get theirs.
  const address = senderAddress();
  const ownSender = address != null && !address.endsWith("@resend.dev");
  const production = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  const owners = (process.env.ADMIN_EMAILS || "mouhannad@felicitypro.com").split(",").map((e) => e.trim().toLowerCase());
  const allowed = due.filter((m) => !production || ownSender || owners.includes(m.to.trim().toLowerCase()));
  if (allowed.length < due.length) {
    console.error(`[import] EMAIL_FROM is not a sender on a domain verified in Resend — ${due.length - allowed.length} email(s) not sent; the users only get the in-app notices.`);
  }
  const from = address ? senderFrom() : `OffplanDistress <${TEST_SENDER}>`;
  const replyTo = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mouhannad@felicitypro.com";
  const payloads = allowed.map((m) => {
    // The public page in the recipient's language (src/i18n/paths.ts localePath); the in-app notice keeps the plain path.
    const href = `${siteUrl()}${m.lang === "en" ? "" : `/${m.lang}`}${m.href}`;
    return { from, to: [m.to], reply_to: replyTo, subject: m.title, html: emailHtml(m, href), text: [m.title, m.body, `${m.cta}: ${href}`].join("\n\n") };
  });
  let sent = 0;
  for (let i = 0; i < payloads.length; i += EMAIL_BATCH) {
    if (i) await sleep(EMAIL_GAP_MS);
    sent += await postEmails(payloads.slice(i, i + EMAIL_BATCH), key);
  }
  if (payloads.length) console.log(`[import] ${sent} of ${payloads.length} email(s) sent.`);
}

/** One Resend request (the batch endpoint for more than one), retried after a 429 as Resend asks; how many it accepted. */
async function postEmails(payloads, key) {
  const single = payloads.length === 1;
  try {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`https://api.resend.com/emails${single ? "" : "/batch"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(single ? {} : { "x-batch-validation": "permissive" }) },
        body: JSON.stringify(single ? payloads[0] : payloads),
        signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        for (const e of body?.errors ?? []) console.error(`[import] Resend rejected an email: ${e.message}`);
        return payloads.length - (body?.errors?.length ?? 0);
      }
      if (res.status === 429 && attempt < 3 && !/quota/i.test(body?.name ?? "")) {
        await sleep(Math.min(Number(res.headers.get("retry-after")) || 1, 10) * 1000);
        continue;
      }
      console.error(`[import] Resend ${res.status} for ${payloads.length} email(s): ${JSON.stringify(body)}`);
      return 0;
    }
  } catch (err) {
    console.error(`[import] sending ${payloads.length} email(s) failed:`, err?.message ?? err);
    return 0;
  }
}
