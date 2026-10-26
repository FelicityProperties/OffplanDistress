import { runCron } from "@/lib/cron";
import { enforcePermitExpiry } from "@/lib/permits";

// Daily operations, run by Vercel Cron (see vercel.json) early on a Dubai morning: pauses live adverts whose DLD permit
// or Form A ran out, asks the admins what to do about units with an agreed deal whose documents ran out ("flagged"),
// and reminds them of the ones running out soon. runCron checks CRON_SECRET and alerts the admins when a run fails;
// OPS_HEARTBEAT_URL (optional) is pinged after every clean run.

export const maxDuration = 60;

export async function GET(request: Request) {
  return runCron(
    "ops-daily",
    request,
    async () => {
      const permits = await enforcePermitExpiry();
      return { paused: permits.paused, flagged: permits.flagged, reminded: permits.reminded, failed: permits.failed };
    },
    { heartbeatUrl: process.env.OPS_HEARTBEAT_URL },
  );
}
