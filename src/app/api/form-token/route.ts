import { connection } from "next/server";
import { issueFormToken, TOKEN_MIN_AGE_MS } from "@/lib/spam";

// A fresh form token (src/lib/spam.ts) for a form rendered without one, or left open for an hour
// (src/components/SpamGuard.tsx). No auth: the token only says when it was issued. Never cached. Dated TOKEN_MIN_AGE_MS
// back: it replaces the token of a form that was filled in long ago, so a visitor who sends right after the replacement
// is not taken for a script (a script that finds this route only saves the three seconds it would have had to wait).

export async function GET() {
  await connection();
  return Response.json({ token: issueFormToken(Date.now() - TOKEN_MIN_AGE_MS) }, { headers: { "Cache-Control": "no-store" } });
}
