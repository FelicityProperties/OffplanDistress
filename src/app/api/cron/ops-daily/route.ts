import { purgeExpiredData } from "@/lib/analytics";
import { runCron } from "@/lib/cron";
import { enforcePermitExpiry } from "@/lib/permits";
import { sendFollowUps } from "@/lib/reminders";

// Daily operations, run by Vercel Cron (see vercel.json) early on a Dubai morning: pauses live adverts whose DLD permit
// or Form A ran out, asks the admins what to do about units with an agreed deal whose documents ran out ("flagged"),
// and reminds them of the ones running out soon. Then the follow-ups (src/lib/reminders.ts): sellers and buyers who
// stopped partway get their own nudge, once each ("nudged"), and the admins one digest a day of everything waiting on
// someone ("followUps" items; "digest" when it went out). Then applies the Privacy Policy's retention periods: visit
// statistics older than 13 months, and seller estimate requests untouched for 24 months that never became an account or a
// listing, are deleted in batches. runCron checks CRON_SECRET and alerts the admins when a run fails (a failed
// clean-up counts as one failure); OPS_HEARTBEAT_URL (optional) is pinged after every clean run.

export const maxDuration = 60;

export async function GET(request: Request) {
  return runCron(
    "ops-daily",
    request,
    async () => {
      // Each step fails on its own (counted in "failed", which alerts the admins): a failed permit run mustn't cost the
      // day's follow-ups and clean-up too. The follow-ups don't count a lapsed advert as live either way.
      let permits: Awaited<ReturnType<typeof enforcePermitExpiry>> | null = null;
      try {
        permits = await enforcePermitExpiry();
      } catch (err) {
        console.error("[cron] ops-daily permit run failed", err);
      }
      // After the permit run, so an advert it just paused isn't counted as live.
      let follow: Awaited<ReturnType<typeof sendFollowUps>> | null = null;
      try {
        follow = await sendFollowUps();
      } catch (err) {
        console.error("[cron] ops-daily follow-ups failed", err);
      }
      let purged: { views: number; leads: number } | null = null;
      try {
        purged = await purgeExpiredData();
      } catch (err) {
        console.error("[cron] ops-daily retention clean-up failed", err);
      }
      return {
        paused: permits?.paused ?? 0,
        flagged: permits?.flagged ?? 0,
        reminded: permits?.reminded ?? 0,
        nudged: follow?.nudged ?? 0,
        nudgesDeferred: follow?.deferred ?? 0,
        digest: follow?.digest ?? false,
        followUps: follow?.followUps ?? 0,
        purgedViews: purged?.views ?? 0,
        purgedLeads: purged?.leads ?? 0,
        failed: (permits ? permits.failed : 1) + (follow ? follow.failed : 1) + (purged ? 0 : 1),
      };
    },
    { heartbeatUrl: process.env.OPS_HEARTBEAT_URL },
  );
}
