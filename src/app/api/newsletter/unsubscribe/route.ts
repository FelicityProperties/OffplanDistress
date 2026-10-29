import { NextResponse, type NextRequest } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { TOKEN_RE, unsubscribe, unsubscribePath } from "@/lib/newsletter";

// POST /api/newsletter/unsubscribe?t=<token> — unsubscribes the address behind the token (src/lib/newsletter.ts). Two
// callers: the unsubscribe page's form (then back to the page, which now says so), and mail providers' one-click
// unsubscribe (RFC 8058: every issue's List-Unsubscribe header names this address and the provider POSTs
// "List-Unsubscribe=One-Click" to it, expecting a 200 and no page). The token is the only credential, as in the links
// themselves, and only a POST unsubscribes: a mail client scanning an issue's links can't unsubscribe anyone.

export async function POST(request: NextRequest) {
  const type = request.headers.get("content-type") ?? "";
  const form = /application\/x-www-form-urlencoded|multipart\/form-data/i.test(type) ? await request.formData().catch(() => null) : null;
  const field = (name: string) => {
    const v = form?.get(name);
    return typeof v === "string" ? v.trim() : "";
  };
  const token = request.nextUrl.searchParams.get("t")?.trim() || field("t") || field("token");
  if (token && TOKEN_RE.test(token)) await unsubscribe(token);
  // A mail provider wants a bare 200 (for a token it doesn't know too: there is nobody to show a page to).
  if (field("List-Unsubscribe") === "One-Click") return new Response(null, { status: 200 });
  const locale: Locale = isLocale(field("locale")) ? (field("locale") as Locale) : "en";
  return NextResponse.redirect(new URL(unsubscribePath(token, locale), request.url), 303);
}
