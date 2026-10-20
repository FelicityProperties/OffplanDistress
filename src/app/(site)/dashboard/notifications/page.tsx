import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { MarkAllReadButton, NotificationLink } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("notifications");
  return { title: t("page.title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const [t, tc, locale, rows, [count]] = await Promise.all([
    getT("notifications"),
    getT("common"),
    getLocale(),
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(PAGE_LIMIT),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
  ]);
  const unread = count?.unread ?? 0;

  return (
    <div className="space-y-6">
      <PageTitle title={t("page.title")} sub={unread > 0 ? t("page.subUnread", { count: unread }) : t("page.sub")}>
        {unread > 0 && <MarkAllReadButton />}
      </PageTitle>

      {rows.length === 0 ? (
        <EmptyState title={t("page.emptyTitle")} sub={t("page.emptySub")}>
          <Button asChild>
            <Link href="/deals">{tc("browseDeals")}</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {rows.map((n) => {
              const read = n.readAt != null;
              return (
                <li key={n.id}>
                  <NotificationLink
                    id={n.id}
                    href={n.href}
                    read={read}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-4 text-start transition-colors",
                      (n.href || !read) && "hover:bg-accent/60",
                      !read && "bg-gold-soft/40",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", read ? "bg-border" : "bg-gold")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span dir="auto" className={cn("text-sm", read ? "font-medium" : "font-semibold")}>
                          {n.title}
                        </span>
                        <time
                          dateTime={n.createdAt.toISOString()}
                          title={formatDate(n.createdAt, locale)}
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          {timeAgo(n.createdAt, locale)}
                        </time>
                      </span>
                      {n.body && (
                        <span dir="auto" className="mt-1 block text-sm text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      {!read && <span className="sr-only">{t("unread")}</span>}
                    </span>
                    {n.href && (
                      <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    )}
                  </NotificationLink>
                </li>
              );
            })}
          </ul>
          {rows.length >= PAGE_LIMIT && (
            <p className="text-center text-xs text-muted-foreground">{t("page.limitNote", { count: PAGE_LIMIT })}</p>
          )}
        </>
      )}
    </div>
  );
}
