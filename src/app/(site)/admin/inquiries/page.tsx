import Link from "next/link";
import { HandledToggle } from "@/components/admin/AdminControls";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { adminInquiries } from "@/lib/admin";
import { refCode, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE = { info: "Info request", viewing: "Viewing request", contact: "Contact form" } as const;

export default async function InquiriesPage() {
  await requireAdmin();
  const rows = await adminInquiries();
  return (
    <div className="space-y-6">
      <PageTitle title="Inquiries" sub="Viewing requests, deal questions and contact-form messages." />
      {rows.length === 0 ? (
        <EmptyState title="No inquiries yet" />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {rows.map(({ inquiry: q, refNo, projectName }) => (
            <div key={q.id} className={cn("flex flex-wrap items-start justify-between gap-4 p-5", q.handled && "opacity-60")}>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{q.name}</p>
                  <StatusPill tone={q.type === "viewing" ? "gold" : "muted"}>{TYPE[q.type]}</StatusPill>
                  <span className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</span>
                </div>
                <p className="text-sm">
                  <a href={`mailto:${q.email}`} className="hover:underline">
                    {q.email}
                  </a>
                  {q.phone && (
                    <>
                      {" · "}
                      <a href={`tel:${q.phone}`} className="hover:underline">
                        {q.phone}
                      </a>
                    </>
                  )}
                </p>
                {refNo && (
                  <p className="text-sm text-muted-foreground">
                    Re:{" "}
                    <Link href={`/deals/${refCode(refNo)}`} className="hover:underline">
                      {projectName} ({refCode(refNo)})
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
