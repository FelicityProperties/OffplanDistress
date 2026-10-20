import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ file: files, sellerId: listings.sellerId })
    .from(files)
    .leftJoin(listings, eq(listings.id, files.listingId))
    .where(eq(files.id, id))
    .limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  const { file } = row;
  const isPublic = file.kind === "photo";
  if (!isPublic) {
    // SPA, Oqood, statements and IDs: only the owner and our team.
    const user = await getCurrentUser();
    const allowed = user && (user.role === "admin" || user.id === file.uploaderId || user.id === row.sellerId);
    if (!allowed) return new Response("Not found", { status: 404 });
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
