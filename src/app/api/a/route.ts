import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { localeOfPath, stripLocale } from "@/i18n/paths";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_ID_RE } from "@/lib/attribution";
import {
  allowBeacon,
  cleanPath,
  cleanText,
  describeDevice,
  forgetSession,
  geoFrom,
  ipFrom,
  isBotRequest,
  isSafePath,
  recordDuration,
  recordView,
  UNTRACKED_PATH,
  visitorHash,
} from "@/lib/analytics";

// Beacon endpoint for the anonymous visit statistics (src/components/analytics/PageViewTracker.tsx → /admin/analytics).
// Always answers 204 with no body, whatever happens: a beacon has nobody to show an error to, and the answer must not
// tell a script whether it was counted. Not counted: bots, other sites' pages, floods, signed-in admins (on any device),
// and our own consoles.

/** Bytes. A real beacon is a few hundred; Arabic campaign tags take two bytes a letter. */
const MAX_BODY = 4096;

const sessionId = z.string().regex(SESSION_ID_RE);
const tag = (max: number) =>
  z
    .string()
    .max(500)
    .transform((s) => cleanText(s).slice(0, max) || null)
    .nullish();

const Beacon = z.discriminatedUnion("t", [
  // A page was shown.
  z.object({
    t: z.literal("v"),
    viewId: z.uuid(),
    sessionId,
    path: z.string().min(1).max(300).refine(isSafePath),
    // Host of the referring site, sent with the first page of a visit only.
    referrer: z
      .string()
      .max(253)
      .regex(/^[a-z0-9.-]+(:\d{1,5})?$/i)
      .nullish(),
    utm_source: tag(100),
    utm_medium: tag(100),
    utm_campaign: tag(150),
    ref: tag(60),
    locale: z.enum(LOCALES).nullish(),
  }),
  // The visitor left the page (or hid the tab): the time it was visible so far.
  z.object({ t: z.literal("l"), viewId: z.uuid(), sessionId, durationMs: z.number().finite().nonnegative().max(86_400_000) }),
  // A signed-in admin's tab: forget the views it recorded before they logged in.
  z.object({ t: z.literal("f"), sessionId }),
]);

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    await handle(request);
  } catch (err) {
    console.error("[analytics] beacon failed", err instanceof Error ? err.message.split("\n")[0] : err);
  }
  return done();
}

/** The body as text, or null once it passes `max` bytes (stops reading there, whatever Content-Length claimed). */
async function readBody(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function handle(request: Request) {
  const h = request.headers;
  if (Number(h.get("content-length") ?? 0) > MAX_BODY) return;
  // Only our own pages send beacons: browsers mark other sites' requests.
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin") return;
  const origin = h.get("origin");
  if (origin && origin !== "null" && hostOf(origin) !== h.get("host")) return;
  if (isBotRequest(h)) return;

  const text = await readBody(request, MAX_BODY);
  if (text == null) return;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return;
  }
  const parsed = Beacon.safeParse(json);
  if (!parsed.success) return;
  const b = parsed.data;

  const ip = ipFrom(h);
  if (!allowBeacon(ip)) return;

  // Admins are never counted, on any device; their tab's earlier, signed-out views go too.
  const user = await getCurrentUser();
  if (user?.role === "admin") {
    await forgetSession(b.sessionId);
    return;
  }

  if (b.t === "l") return recordDuration(b.viewId, b.sessionId, b.durationMs);
  if (b.t !== "v") return;
  // The same page in every language is one page in the report: "/ar/deals" and "/zh/deals" count as "/deals", in
  // Arabic or Chinese.
  let path = cleanPath(b.path);
  let locale = b.locale ?? null;
  const named = localeOfPath(path);
  if (named) {
    path = stripLocale(path);
    locale = named;
  }
  if (UNTRACKED_PATH.test(path)) return;

  const ownHost = (h.get("host") ?? "").toLowerCase().split(":")[0];
  const refHost = b.referrer?.toLowerCase().split(":")[0] || null;
  await recordView({
    viewId: b.viewId,
    sessionId: b.sessionId,
    visitorHash: await visitorHash(ip, h.get("user-agent") ?? ""),
    path: path.slice(0, 200),
    referrerHost: refHost && refHost !== ownHost ? refHost : null,
    utmSource: b.utm_source ?? null,
    utmMedium: b.utm_medium ?? null,
    utmCampaign: b.utm_campaign ?? null,
    ref: b.ref ?? null,
    ...geoFrom(h),
    ...describeDevice(h),
    locale,
  });
}
