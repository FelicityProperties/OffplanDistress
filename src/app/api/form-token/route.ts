import { connection } from "next/server";
import { issueFormToken } from "@/lib/spam";

// A fresh form token (src/lib/spam.ts) for a form rendered without one, or left open for an hour
// (src/components/SpamGuard.tsx). No auth: the token only says when it was issued. Never cached.

export async function GET() {
  await connection();
  return Response.json({ token: issueFormToken() }, { headers: { "Cache-Control": "no-store" } });
}
