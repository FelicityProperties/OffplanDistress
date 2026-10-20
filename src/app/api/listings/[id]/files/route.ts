import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/files">) {
  const { id } = await ctx.params;
  const [user, t] = await Promise.all([getCurrentUser(), getT("sell")]);
  if (!user) return NextResponse.json({ error: t("upload.signIn") }, { status: 401 });

  const [listing] = await db
    .select({ sellerId: listings.sellerId, images: listings.images })
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

  if (kind === "photo") {
    await db
      .update(listings)
      .set({ images: sql`array_append(${listings.images}, ${`/api/files/${row.id}`})` })
      .where(eq(listings.id, id));
  }

  return NextResponse.json({ id: row.id });
}
