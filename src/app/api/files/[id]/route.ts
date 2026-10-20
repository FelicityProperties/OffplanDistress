import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

async function notFound() {
  const t = await getT("common");
  return new Response(t("notFoundTitle"), { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();

  const [row] = await db
    .select({ file: files, sellerId: listings.sellerId })
    .from(files)
    .leftJoin(listings, eq(listings.id, files.listingId))
    .where(eq(files.id, id))
    .limit(1);
  if (!row) return notFound();

  const { file } = row;
  const isPublic = file.kind === "photo";
  if (!isPublic) {
    // SPA, Oqood, statements and IDs: only the owner and our team.
    const user = await getCurrentUser();
    const allowed = user && (user.role === "admin" || user.id === file.uploaderId || user.id === row.sellerId);
    if (!allowed) return notFound();
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${isPublic ? "inline" : "attachment"}; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
