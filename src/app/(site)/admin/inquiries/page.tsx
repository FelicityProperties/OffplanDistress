import Link from "next/link";
import { HandledToggle, SpamToggle } from "@/components/admin/AdminControls";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminInquiries, inquiryCounts } from "@/lib/admin";
import { refCode, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

// Typed by hand (not PageProps<"/admin/inquiries">) so it compiles before Next regenerates its route types.
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  // The inbox, or what the spam check caught (src/lib/spam.ts): stored, never counted, nobody notified.
  const view = (await searchParams).view === "spam" ? "spam" : "inbox";
  const spam = view === "spam";
  const [rows, counts, t, locale] = await Promise.all([adminInquiries(view), inquiryCounts(), getT("admin"), getLocale()]);
  const tabs = (
    <nav aria-label={t("inquiries.tabs")} className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1 text-sm" data-testid="inquiry-tabs">
      {(
        [
          ["inbox", "/admin/inquiries", `${t("inquiries.tab.inbox")} (${counts.inbox})`],
          ["spam", "/admin/inquiries?view=spam", `${t("inquiries.tab.spam")} (${counts.spam})`],
        ] as const
      ).map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          aria-current={view === key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === key && "bg-card text-foreground shadow-card",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="space-y-6">
      <PageTitle title={t("inquiries.title")} sub={spam ? t("inquiries.spamSub") : t("inquiries.sub")}>
        {tabs}
      </PageTitle>
      {rows.length === 0 ? (
        <EmptyState title={spam ? t("inquiries.spamEmpty") : t("inquiries.empty")} />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {rows.map(({ inquiry: q, refNo, projectName }) => (
            <div
              key={q.id}
              data-testid="inquiry-row"
              className={cn("flex flex-wrap items-start justify-between gap-4 p-5", q.handled && !spam && "opacity-60")}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{q.name}</p>
                  <StatusPill tone={q.type === "viewing" ? "gold" : "muted"}>{t(`inquiry.${q.type}`)}</StatusPill>
                  <span className="text-xs text-muted-foreground">{timeAgo(q.createdAt, locale)}</span>
                </div>
                <p className="text-sm wrap-anywhere">
                  <a href={`mailto:${q.email}`} className="hover:underline">
                    <bdi dir="ltr">{q.email}</bdi>
                  </a>
                  {q.phone && (
                    <>
                      {" · "}
                      <a href={`tel:${q.phone}`} className="hover:underline">
                        <bdi dir="ltr">{q.phone}</bdi>
                      </a>
                    </>
                  )}
                </p>
                {refNo && (
                  <p className="text-sm text-muted-foreground">
                    {t("inquiries.re")}{" "}
                    <Link href={`/deals/${refCode(refNo)}`} className="hover:underline">
                      {projectName} (<bdi>{refCode(refNo)}</bdi>)
                    </Link>
                  </p>
                )}
                {/* wrap-anywhere: a pitch is mostly one long link. */}
                {q.message && <p dir="auto" className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground wrap-anywhere">{q.message}</p>}
                {spam && q.spamReason && (
                  <p className="text-xs font-medium text-warning wrap-anywhere" data-testid="spam-reason">
                    {t("inquiry.spamReason", { reason: q.spamReason })}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!spam && <HandledToggle id={q.id} handled={q.handled} />}
                <SpamToggle id={q.id} spam={q.spam} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
