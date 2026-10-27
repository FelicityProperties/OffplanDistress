import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings, notifications } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { translator } from "@/i18n/translator";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";
import { refCode } from "@/lib/format";
import { notifyAdmins } from "@/lib/notify";
import { isUuid } from "@/lib/utils";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Photos go into the public gallery, so only formats every browser can show (the sell form converts phone photos to
// JPEG before upload; HEIC scans of documents are still accepted for our team).
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Per-listing limits for sellers (documents live in Postgres, so keep them bounded).
const MAX_FILES = 30;
const MAX_BYTES = 60 * 1024 * 1024;
const MAX_PHOTOS = 20;

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/files">) {
  const { id } = await ctx.params;
  // Errors in the language of the page that uploads (?locale=, uploadListingFile): an API route has no address of its
  // own to take it from.
  const asked = new URL(request.url).searchParams.get("locale");
  const [user, t] = await Promise.all([getCurrentUser(), isLocale(asked) ? translator("sell", asked) : getT("sell")]);
  if (!user) return NextResponse.json({ error: t("upload.signIn") }, { status: 401 });
  // Not an id at all: the same answer as a listing that isn't theirs (the database would throw on it).
  if (!isUuid(id)) return NextResponse.json({ error: t("upload.notFound") }, { status: 404 });

  // Reject oversized bodies before buffering them.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: t("upload.bodyTooLarge") }, { status: 413 });
  }

  const [listing] = await db
    .select({
      sellerId: listings.sellerId,
      images: listings.images,
      status: listings.status,
      projectName: listings.projectName,
      refNo: listings.refNo,
      // A listing our team entered whose seller hasn't confirmed it yet (src/lib/claim.ts): the account it was filed
      // under isn't its owner until then (as in src/app/api/files/[id]/route.ts).
      awaitingSeller: sql<boolean>`coalesce(${listings.createdByStaff} and ${listings.ownershipConfirmedAt} is null, false)`,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing || ((listing.sellerId !== user.id || listing.awaitingSeller) && user.role !== "admin")) {
    return NextResponse.json({ error: t("upload.notFound") }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "other");
  if (!(file instanceof File)) return NextResponse.json({ error: t("upload.noFile") }, { status: 400 });
  // The owner's signed Form A can confirm ownership of a listing our team entered (adminConfirmFormA): our team files it.
  if (!(kind in FILE_KINDS) || (kind === "form_a" && user.role !== "admin")) {
    return NextResponse.json({ error: t("upload.unknownKind") }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: t("upload.tooLarge", { name: file.name }) }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: t("upload.badType", { name: file.name }) }, { status: 415 });
  }
  if (kind === "photo" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: t("upload.photoOnly") }, { status: 415 });
  }
  if (kind === "photo" && !PHOTO_TYPES.has(file.type)) {
    return NextResponse.json({ error: t("upload.photoType", { name: file.name }) }, { status: 415 });
  }

  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    const [{ n, bytes }] = await db
      .select({ n: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files)
      .where(eq(files.listingId, id));
    if (n >= MAX_FILES || Number(bytes) + file.size > MAX_BYTES) {
      return NextResponse.json({ error: t("upload.quota") }, { status: 413 });
    }
    if (kind === "photo" && listing.images.length >= MAX_PHOTOS) {
      return NextResponse.json({ error: t("upload.photoLimit") }, { status: 413 });
    }
  }

  const [row] = await db
    .insert(files)
    .values({
      listingId: id,
      uploaderId: user.id,
      kind: kind as keyof typeof FILE_KINDS,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    })
    .returning({ id: files.id });
  // Our team adding a document or photo to a seller's listing goes in the audit trail (src/lib/audit.ts): the kind and
  // the file name, never the contents.
  if (isAdmin && listing.sellerId !== user.id) {
    await audit({ actorId: user.id, action: "file.upload", entityType: "file", entityId: row.id, diff: { kind, filename: file.name.slice(0, 200) } });
  }

  // Seller photos go into the public gallery while the listing is still in review (our team checks them
  // before approving). Once it's live, new seller photos wait for an admin to add them from the review page, and our
  // team is told: one notice per listing until an admin has read it, however many photos follow.
  if (kind === "photo" && (isAdmin || listing.status === "pending_review")) {
    await db
      .update(listings)
      .set({ images: sql`array_append(${listings.images}, ${`/api/files/${row.id}`})` })
      .where(eq(listings.id, id));
  } else if (kind === "photo" && listing.status !== "withdrawn" && listing.status !== "transferred") {
    const href = `/admin/listings/${id}`;
    const [waiting] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "listing.photos"), eq(notifications.href, href), isNull(notifications.readAt)))
      .limit(1);
    if (!waiting) {
      await notifyAdmins("listing.photos", { project: listing.projectName, seller: user.fullName, ref: refCode(listing.refNo) }, href, {
        except: [user.id],
      });
    }
  }

  return NextResponse.json({ id: row.id, ...(kind === "photo" && !isAdmin && listing.status !== "pending_review" ? { review: true } : {}) });
}
