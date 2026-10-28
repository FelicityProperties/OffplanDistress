// Loads a partner network's units (scripts/partner-stock/*.json, the offplandistress-import/1 format with each photo's
// source URL instead of its bytes) into the database the way /admin/listings/import does — on the production build,
// where the database is reachable. Every listing is created in review, entered by staff, ownership not confirmed,
// under the network's placeholder owner (src/lib/import.ts), so nothing here is public until our team sets the owner,
// ownership is confirmed and the Trakheesi permit is in (src/app/actions/import.ts has the same rules). Runs again on
// every build and does nothing for units already imported; photos still missing are fetched again.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STOCK_DIR = path.join(root, "scripts", "partner-stock");
const FORMAT = "offplandistress-import/1";
const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_WIDTH = 1024;
const FETCH_TIMEOUT_MS = 30_000;
const INT_MAX = 2_147_483_647;

export async function importPartnerStock(pool) {
  let names = [];
  try {
    names = (await readdir(STOCK_DIR)).filter((n) => n.endsWith(".json")).sort();
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
  const createdIds = [];
  for (const unit of units) {
    try {
      const { id, isNew } = await ensureListing(pool, source, unit, ownerId, actor);
      if (isNew) {
        created++;
        createdIds.push(id);
      }
      photos += await ensurePhotos(pool, id, unit.photos ?? [], actor ?? ownerId, sharp);
    } catch (err) {
      failed++;
      console.error(`[import] ${source.name} ${unit?.ref}: failed`, err?.message ?? err);
    }
  }
  console.log(`[import] ${source.name}: ${created} listings created, ${photos} photos added, ${failed} failed (${units.length} in the file).`);
  if (created) await tellAdmins(pool, source, created);
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
  const provenance = {
    import: source.key,
    sourceName: source.name,
    ref: unit.ref,
    url: unit.url ?? null,
    posted: unit.posted ?? null,
    notes: unit.notes ?? null,
    importedAt: new Date().toISOString(),
    importedBy: actor,
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
