import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/files">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const [listing] = await db
    .select({ sellerId: listings.sellerId, images: listings.images })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing || (listing.sellerId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "other");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!(kind in FILE_KINDS)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `${file.name} is larger than 4 MB.` }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `${file.name}: upload a PDF, JPG, PNG or WebP.` }, { status: 415 });
  }
  if (kind === "photo" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Photos must be images." }, { status: 415 });
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
