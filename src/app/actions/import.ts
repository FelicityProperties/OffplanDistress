"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings, users } from "@/db/schema";
import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { findUserByEmail, getCurrentUser, isOwnerEmail } from "@/lib/auth";
import { importOwnerEmail, importOwnerName, isImportOwner } from "@/lib/import";
import {
  checkImportSource,
  checkListing,
  checkUnitMeta,
  IMPORT_KEY_RE,
  IMPORT_MAX_REFS,
  IMPORT_REF_RE,
  type ImportSource,
} from "@/lib/import-format";

// Bulk import (/admin/listings/import): one unit per call, so every request stays small (photos follow through the
// upload route, one by one). Nothing here makes a listing public: each one is created in review, entered by staff and
// unconfirmed, under a placeholder owner (src/lib/import.ts), so approveListing refuses it until its owner is set and
// confirms and its permit is in.

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error((await getT("errors"))("auth.notAuthorised"));
  return user;
}

const importKey = sql`(${listings.source}->>'import')`;
const importRef = sql`(${listings.source}->>'ref')`;

export type ImportedUnit = { listingId: string; refNo: number; photos: string[] };

/**
 * The units of a source already imported, by ref: their listing and the names of the photos it already has, so the
 * page skips what is done when the files are chosen again (after a reload, say) and adds only the missing photos.
 */
export async function adminImportStatus(sourceKey: string, refs: string[]): Promise<{ imported: Record<string, ImportedUnit> } | { error: string }> {
  await assertAdmin();
  const wanted = Array.isArray(refs) ? [...new Set(refs.filter((r) => typeof r === "string" && IMPORT_REF_RE.test(r)))] : [];
  if (typeof sourceKey !== "string" || !IMPORT_KEY_RE.test(sourceKey) || wanted.length > IMPORT_MAX_REFS) {
    return { error: (await getT("intake"))("error.status") };
  }
  if (!wanted.length) return { imported: {} };
  const rows = await db
    .select({ id: listings.id, refNo: listings.refNo, ref: sql<string>`${importRef}` })
    .from(listings)
    .where(and(sql`${importKey} = ${sourceKey}`, inArray(importRef, wanted)));
  const photos = rows.length
    ? await db
        .select({ listingId: files.listingId, filename: files.filename })
        .from(files)
        .where(and(eq(files.kind, "photo"), inArray(files.listingId, rows.map((r) => r.id))))
    : [];
  const imported: Record<string, ImportedUnit> = {};
  for (const r of rows) {
    imported[r.ref] = { listingId: r.id, refNo: r.refNo, photos: photos.filter((p) => p.listingId === r.id).map((p) => p.filename) };
  }
  return { imported };
}

/** The source's placeholder owner, created the first time; null if that address is taken by an account that can sign in. */
async function placeholderOwner(source: ImportSource) {
  const email = importOwnerEmail(source.key);
  await db
    .insert(users)
    .values({ email, fullName: importOwnerName(source.name), passwordHash: null, role: "user", intent: "sell", locale: "en" })
    .onConflictDoNothing();
  const owner = await findUserByEmail(email);
  if (!owner || owner.role !== "user" || isOwnerEmail(owner.email) || !isImportOwner(owner)) return null;
  return owner.id;
}

async function findImported(key: string, ref: string) {
  const [row] = await db
    .select({ id: listings.id, refNo: listings.refNo })
    .from(listings)
    .where(and(sql`${importKey} = ${key}`, sql`${importRef} = ${ref}`))
    .limit(1);
  return row ?? null;
}

export type ImportResult =
  | { ok: true; created: boolean; listingId: string; refNo: number }
  | { ok?: undefined; error: string };

/**
 * Creates the listing of one unit, as staff intake does (adminCreateListing): in review, entered by staff, ownership not
 * confirmed, under the source's placeholder owner, with where it came from in listings.source. A unit already imported
 * from this source (same ref) is skipped, also when two tabs import the same file at once (the unique index on
 * source key + ref decides). The unit's fields are checked again here by the rules the page used.
 */
export async function adminImportListing(source: unknown, unit: unknown): Promise<ImportResult> {
  const me = await assertAdmin();
  const [ti, te] = await Promise.all([getT("intake"), getT("errors")]);
  const src = checkImportSource(source);
  if (!src) return { error: ti("file.source") };
  const meta = checkUnitMeta(unit, ti);
  if (!meta.ok) return { error: meta.error };
  const fields = checkListing((unit as { listing?: unknown }).listing, ti, te);
  if (!fields.ok) return { error: fields.error };
  const { ref, url, posted, notes } = meta.meta;
  const v = fields.data;

  try {
    const done = await findImported(src.key, ref);
    if (done) return { ok: true, created: false, listingId: done.id, refNo: done.refNo };
    const ownerId = await placeholderOwner(src);
    if (!ownerId) return { error: ti("error.ownerTaken") };
    const [row] = await db
      .insert(listings)
      .values({
        sellerId: ownerId,
        projectName: v.projectName,
        developer: v.developer,
        community: v.community,
        developerOther: v.developer === "Other" ? (v.developerOther ?? null) : null,
        communityOther: v.community === "Other" ? (v.communityOther ?? null) : null,
        unitType: v.unitType,
        sizeSqft: v.sizeSqft,
        floor: v.floor ?? null,
        view: v.view ?? null,
        originalPrice: v.originalPrice,
        amountPaid: v.amountPaid,
        askingPrice: v.askingPrice,
        handoverDate: v.handoverDate,
        nextInstalmentDate: v.nextInstalmentDate,
        nextInstalmentAmount: v.nextInstalmentAmount ?? null,
        // The source's figure, unchecked (arrears_checked_at stays empty until our team checks the statement).
        overdueAmount: v.overdueAmount ?? null,
        motivation: v.motivation,
        description: v.description ?? null,
        paymentPlan: v.paymentPlan,
        source: {
          import: src.key,
          sourceName: src.name,
          ref,
          url,
          posted,
          notes,
          importedAt: new Date().toISOString(),
          importedBy: me.id,
        },
        createdByStaff: true,
        ownershipConfirmedAt: null,
      })
      // Imported at the same moment from another tab: the unique index on (source key, ref) keeps one.
      .onConflictDoNothing()
      .returning({ id: listings.id, refNo: listings.refNo });
    if (!row) {
      const other = await findImported(src.key, ref);
      return other ? { ok: true, created: false, listingId: other.id, refNo: other.refNo } : { error: ti("error.failed") };
    }
    await audit({
      actorId: me.id,
      action: "listing.import",
      entityType: "listing",
      entityId: row.id,
      diff: {
        status: [null, "pending_review"],
        projectName: [null, v.projectName],
        originalPrice: [null, v.originalPrice],
        amountPaid: [null, v.amountPaid],
        askingPrice: [null, v.askingPrice],
        importSource: src.name,
        importRef: ref,
      },
    });
    return { ok: true, created: true, listingId: row.id, refNo: row.refNo };
  } catch (err) {
    console.error(`[import] ${src.key} ${ref} failed`, err instanceof Error ? err.message : err);
    return { error: ti("error.failed") };
  }
}
