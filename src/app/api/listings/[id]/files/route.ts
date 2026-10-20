import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Per-listing limits for sellers (documents live in Postgres, so keep them bounded).
const MAX_FILES = 30;
const MAX_BYTES = 60 * 1024 * 1024;
const MAX_PHOTOS = 20;

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/files">) {
  const { id } = await ctx.params;
  const [user, t] = await Promise.all([getCurrentUser(), getT("sell")]);
  if (!user) return NextResponse.json({ error: t("upload.signIn") }, { status: 401 });

  // Reject oversized bodies before buffering them.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: t("upload.bodyTooLarge") }, { status: 413 });
  }

  const [listing] = await db
    .select({ sellerId: listings.sellerId, images: listings.images, status: listings.status })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing || (listing.sellerId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ error: t("upload.notFound") }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "other");
  if (!(file instanceof File)) return NextResponse.json({ error: t("upload.noFile") }, { status: 400 });
  if (!(kind in FILE_KINDS)) return NextResponse.json({ error: t("upload.unknownKind") }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: t("upload.tooLarge", { name: file.name }) }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: t("upload.badType", { name: file.name }) }, { status: 415 });
  }
  if (kind === "photo" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: t("upload.photoOnly") }, { status: 415 });
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

  // Seller photos go into the public gallery while the listing is still in review (our team checks them
  // before approving). Once it's live, new seller photos wait for an admin to add them from the review page.
  if (kind === "photo" && (isAdmin || listing.status === "pending_review")) {
    await db
      .update(listings)
      .set({ images: sql`array_append(${listings.images}, ${`/api/files/${row.id}`})` })
      .where(eq(listings.id, id));
  }

  return NextResponse.json({ id: row.id });
}
