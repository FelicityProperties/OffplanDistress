"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { dateLocale } from "@/lib/format";
import { cn } from "@/lib/utils";

// Transfer milestones under the status pipeline on the seller's listing page and the buyer's offers page. Only the
// dates our team recorded in the deal file (src/lib/deals.ts): nothing about the other party.

export type MilestoneDates = {
  acceptedOn: string | null;
  formFSignedAt: string | null;
  nocAppliedAt: string | null;
  nocIssuedAt: string | null;
  transferBookedFor: string | null;
  transferredAt: string | null;
};

const STEPS = [
  ["acceptedOn", "milestones.accepted"],
  ["formFSignedAt", "milestones.mou"],
  ["nocAppliedAt", "milestones.nocApplied"],
  ["nocIssuedAt", "milestones.nocIssued"],
  ["transferBookedFor", "milestones.transferBooked"],
  ["transferredAt", "milestones.transferred"],
] as const;

/** "2026-10-24" → "24 Oct 2026" (as formatDate), read as a calendar day: the same on the server and in any time zone. */
function dayLabel(day: string, locale: Locale) {
  return new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DealMilestones({ dates, className }: { dates: MilestoneDates; className?: string }) {
  const t = useT("dashboard");
  const locale = useLocale();
  // A step left without a date once a later one has its date (no NOC application date on an issued NOC, no appointment
  // on a completed transfer) isn't "pending" any more: it just wasn't recorded.
  const lastDated = STEPS.reduce((n, [key], i) => (dates[key] ? i : n), -1);
  return (
    <div className={cn("rounded-lg border bg-secondary/40 p-3", className)} data-testid="deal-milestones">
      <p className="text-xs font-semibold">{t("milestones.title")}</p>
      <ol className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([key, label], i) => {
          const date = dates[key];
          // An appointment ahead is booked, not done.
          const done = date != null && (key !== "transferBookedFor" || dates.transferredAt != null);
          return (
            <li key={key} className="flex items-start gap-2" data-step={key}>
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0">
                {t(label)}
                {done && <span className="sr-only"> — {t("milestones.done")}</span>}
                <span className={cn("block text-xs tabular", date ? "text-foreground" : "text-muted-foreground")}>
                  {date ? dayLabel(date, locale) : t(i < lastDated ? "milestones.notRecorded" : "milestones.pending")}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">{t("milestones.note")}</p>
    </div>
  );
}
