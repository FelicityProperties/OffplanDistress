import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_ID_RE } from "@/lib/attribution";
import {
  allowBeacon,
  describeDevice,
  forgetSession,
  geoFrom,
  ipFrom,
  isBotRequest,
  recordDuration,
  recordView,
  UNTRACKED_PATH,
  visitorHash,
} from "@/lib/analytics";

// Beacon endpoint for the anonymous visit statistics (src/components/analytics/PageViewTracker.tsx → /admin/analytics).
// Always answers 204 with no body, whatever happens: a beacon has nobody to show an error to, and the answer must not
// tell a script whether it was counted. Not counted: bots, other sites' pages, floods, signed-in admins (on any device),
// and our own consoles.

const MAX_BODY = 2048;

const sessionId = z.string().regex(SESSION_ID_RE);
const tag = (max: number) =>
  z
    .string()
    .max(500)
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) || null)
    .nullish();

const Beacon = z.discriminatedUnion("t", [
  // A page was shown.
  z.object({
    t: z.literal("v"),
    viewId: z.uuid(),
    sessionId,
    path: z
      .string()
      .min(1)
      .max(300)
      .regex(/^\/[^?#\s]*$/),
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
    locale: z.enum(["en", "ar"]).nullish(),
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

async function handle(request: Request) {
  const h = request.headers;
  if (Number(h.get("content-length") ?? 0) > MAX_BODY) return;
  // Only our own pages send beacons: browsers mark other sites' requests.
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin") return;
  const origin = h.get("origin");
  if (origin && origin !== "null" && new URL(origin).host !== h.get("host")) return;
  if (isBotRequest(h)) return;

  const text = await request.text();
  if (text.length > MAX_BODY) return;
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
  if (b.t !== "v" || UNTRACKED_PATH.test(b.path)) return;

  const ownHost = (h.get("host") ?? "").toLowerCase().split(":")[0];
  const refHost = b.referrer?.toLowerCase().split(":")[0] || null;
  const path = b.path.replace(/\/+$/, "") || "/";
  await recordView({
    viewId: b.viewId,
    sessionId: b.sessionId,
    visitorHash: visitorHash(ip, h.get("user-agent") ?? ""),
    path: path.slice(0, 200),
    referrerHost: refHost && refHost !== ownHost ? refHost : null,
    utmSource: b.utm_source ?? null,
    utmMedium: b.utm_medium ?? null,
    utmCampaign: b.utm_campaign ?? null,
    ref: b.ref ?? null,
    ...geoFrom(h),
    ...describeDevice(h),
    locale: b.locale ?? null,
  });
}
