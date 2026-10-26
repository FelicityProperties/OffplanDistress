import { purgeExpiredData } from "@/lib/analytics";
import { runCron } from "@/lib/cron";
import { enforcePermitExpiry } from "@/lib/permits";

// Daily operations, run by Vercel Cron (see vercel.json) early on a Dubai morning: pauses live adverts whose DLD permit
// or Form A ran out, asks the admins what to do about units with an agreed deal whose documents ran out ("flagged"),
// and reminds them of the ones running out soon. Then applies the Privacy Policy's retention periods: visit statistics
// older than 13 months, and seller estimate requests untouched for 24 months that never became an account or a
// listing, are deleted in batches. runCron checks CRON_SECRET and alerts the admins when a run fails (a failed
// clean-up counts as one failure); OPS_HEARTBEAT_URL (optional) is pinged after every clean run.

export const maxDuration = 60;

export async function GET(request: Request) {
  return runCron(
    "ops-daily",
    request,
    async () => {
      const permits = await enforcePermitExpiry();
      let purged: { views: number; leads: number } | null = null;
      try {
        purged = await purgeExpiredData();
      } catch (err) {
        console.error("[cron] ops-daily retention clean-up failed", err);
      }
      return {
        paused: permits.paused,
        flagged: permits.flagged,
        reminded: permits.reminded,
        purgedViews: purged?.views ?? 0,
        purgedLeads: purged?.leads ?? 0,
        failed: permits.failed + (purged ? 0 : 1),
      };
    },
    { heartbeatUrl: process.env.OPS_HEARTBEAT_URL },
  );
}
