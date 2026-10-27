import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/utils";

async function notFound() {
  const t = await getT("common");
  return new Response(t("notFoundTitle"), { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/**
 * The download's name (RFC 6266): the real one, Arabic or accented, as UTF-8 in filename*, and an ASCII stand-in with
 * the same extension for clients that only read filename. A bare encoded filename="%D8…" is saved as "download".
 */
function disposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\%;]/g, "_") || "file";
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const [row] = await db
    .select({
      file: files,
      sellerId: listings.sellerId,
      // A listing our team entered for a seller (src/lib/claim.ts) that its account holder hasn't confirmed yet.
      awaitingSeller: sql<boolean>`coalesce(${listings.createdByStaff} and ${listings.ownershipConfirmedAt} is null, false)`,
    })
    .from(files)
    .leftJoin(listings, eq(listings.id, files.listingId))
    .where(eq(files.id, id))
    .limit(1);
  if (!row) return notFound();

  const { file } = row;
  // Photos are published with the listing, so anyone with the address may load them, except those of a listing our team
  // entered that its owner hasn't confirmed yet (an imported unit, say): until then they are our team's only.
  const isPublic = file.kind === "photo" && !row.awaitingSeller;
  if (!isPublic) {
    // SPA, Oqood, statements and IDs: only the owner and our team. On a listing our team entered, the account it was
    // filed under only becomes its owner once its holder confirms through the claim link: until then a mistyped email
    // or someone else's account must not open the seller's documents.
    const user = await getCurrentUser();
    const owner = user?.id === row.sellerId && !row.awaitingSeller;
    const allowed = user && (user.role === "admin" || user.id === file.uploaderId || owner);
    if (!allowed) return notFound();
    // Who opened someone else's SPA, statement or ID, and when (the audit trail; never the file's contents).
    if (user.id !== file.uploaderId && file.kind !== "photo") {
      await audit({ actorId: user.id, action: "file.view", entityType: "file", entityId: file.id, diff: { kind: file.kind, filename: file.filename } });
    }
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": disposition(file.kind === "photo" ? "inline" : "attachment", file.filename),
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
