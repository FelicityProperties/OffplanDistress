import { runCron } from "@/lib/cron";
import { enforcePermitExpiry } from "@/lib/permits";

// Daily operations, run by Vercel Cron (see vercel.json) early on a Dubai morning: takes down adverts whose DLD permit
// or Form A ran out yesterday and reminds the admins of the ones running out soon. runCron checks CRON_SECRET and
// alerts the admins when a run fails; OPS_HEARTBEAT_URL (optional) is pinged after every clean run.

export const maxDuration = 60;

export async function GET(request: Request) {
  return runCron(
    "ops-daily",
    request,
    async () => {
      const permits = await enforcePermitExpiry();
      return { paused: permits.paused, reminded: permits.reminded, failed: permits.failed };
    },
    { heartbeatUrl: process.env.OPS_HEARTBEAT_URL },
  );
}
