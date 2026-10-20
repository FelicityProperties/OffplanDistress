import Link from "next/link";
import { HandledToggle } from "@/components/admin/AdminControls";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminInquiries } from "@/lib/admin";
import { refCode, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function InquiriesPage() {
  await requireAdmin();
  const [rows, t, locale] = await Promise.all([adminInquiries(), getT("admin"), getLocale()]);
  return (
    <div className="space-y-6">
      <PageTitle title={t("inquiries.title")} sub={t("inquiries.sub")} />
      {rows.length === 0 ? (
        <EmptyState title={t("inquiries.empty")} />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {rows.map(({ inquiry: q, refNo, projectName }) => (
            <div key={q.id} className={cn("flex flex-wrap items-start justify-between gap-4 p-5", q.handled && "opacity-60")}>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{q.name}</p>
                  <StatusPill tone={q.type === "viewing" ? "gold" : "muted"}>{t(`inquiry.${q.type}`)}</StatusPill>
                  <span className="text-xs text-muted-foreground">{timeAgo(q.createdAt, locale)}</span>
                </div>
                <p className="text-sm">
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
                {q.message && <p className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground">{q.message}</p>}
              </div>
              <HandledToggle id={q.id} handled={q.handled} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
