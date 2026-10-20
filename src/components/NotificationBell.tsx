"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDir, useLocale, useT } from "@/i18n/client";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One row of the header dropdown. `createdAt` is an ISO string so it crosses the server/client boundary as-is. */
export type BellItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

type BellState = { unread: number; items: BellItem[] };
type BellOp = { type: "read"; id: string } | { type: "all" };

function applyOp(state: BellState, op: BellOp): BellState {
  if (op.type === "all") {
    return { unread: 0, items: state.items.map((i) => (i.read ? i : { ...i, read: true })) };
  }
  if (!state.items.some((i) => i.id === op.id && !i.read)) return state;
  return {
    unread: Math.max(0, state.unread - 1),
    items: state.items.map((i) => (i.id === op.id ? { ...i, read: true } : i)),
  };
}

/** Only same-site paths and http(s) links are followed; anything else is ignored. */
function safeHref(href: string | null | undefined) {
  if (!href || /[\x00-\x1f\x7f\\]/.test(href)) return null;
  if (/^\/(?!\/)/.test(href)) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return null;
}

function useGo() {
  const router = useRouter();
  return (href: string) => {
    if (href.startsWith("/")) router.push(href);
    else window.location.assign(href);
  };
}

function badgeText(count: number) {
  return count > 9 ? "9+" : String(count);
}

/**
 * Header bell: unread badge plus a dropdown of the latest notifications. Data is fetched on the server
 * (SiteHeader) and passed in; marking as read goes through server actions that refresh the page.
 */
export function NotificationBell({
  unread,
  items,
  variant = "icon",
  className,
}: {
  unread: number;
  items: BellItem[];
  variant?: "icon" | "full";
  className?: string;
}) {
  const t = useT("notifications");
  const locale = useLocale();
  const dir = useDir();
  const go = useGo();
  const [pending, startTransition] = useTransition();
  const [state, apply] = useOptimistic<BellState, BellOp>({ unread, items }, applyOp);

  const label = state.unread > 0 ? t("bell.labelUnread", { count: state.unread }) : t("bell.label");

  function openItem(item: BellItem) {
    const target = safeHref(item.href);
    startTransition(async () => {
      if (!item.read) {
        apply({ type: "read", id: item.id });
        const res = await markNotificationRead(item.id);
        if (!res.ok) toast.error(res.error);
      }
      if (target) go(target);
    });
  }

  function markAll() {
    startTransition(async () => {
      apply({ type: "all" });
      const res = await markAllNotificationsRead();
      if (!res.ok) toast.error(res.error);
    });
  }

  const badge =
    state.unread > 0 ? (
      <span
        aria-hidden
        className={cn(
          "grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-gold-foreground tabular",
          variant === "icon" && "absolute -top-0.5 -end-0.5",
        )}
      >
        {badgeText(state.unread)}
      </span>
    ) : null;

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" aria-label={label} title={label} className={cn("relative", className)}>
            <Bell />
            {badge}
          </Button>
        ) : (
          <Button variant="outline" aria-label={label} className={cn("justify-between", className)}>
            <span className="inline-flex items-center gap-2">
              <Bell />
              {t("title")}
            </span>
            {badge}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        // Popper alignment is physical: keep the panel growing inwards from the header's end edge in both directions.
        align={variant === "icon" ? (dir === "rtl" ? "start" : "end") : "center"}
        collisionPadding={16}
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm">{t("title")}</DropdownMenuLabel>
          {state.unread > 0 && (
            <span className="text-xs text-muted-foreground tabular">{t("unreadCount", { count: state.unread })}</span>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {state.items.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("empty.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("empty.sub")}</p>
          </div>
        ) : (
          <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-1">
            {state.items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => openItem(n)}
                className={cn("cursor-pointer items-start gap-3 px-3 py-2.5", !n.read && "bg-gold-soft/50")}
              >
                <span
                  aria-hidden
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold")}
                />
                <span className="min-w-0 flex-1">
                  <span dir="auto" className={cn("block truncate text-sm", n.read ? "font-medium" : "font-semibold")}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span dir="auto" className="mt-0.5 line-clamp-2 block whitespace-pre-line text-xs text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    <time dateTime={n.createdAt}>{timeAgo(n.createdAt, locale)}</time>
                    {!n.read && <span className="sr-only"> · {t("unread")}</span>}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="flex items-center justify-between gap-1 p-1">
          <DropdownMenuItem
            disabled={state.unread === 0 || pending}
            onSelect={(e) => {
              e.preventDefault();
              markAll();
            }}
            className="cursor-pointer text-xs font-medium"
          >
            <CheckCheck />
            {t("markAllRead")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium">
            <Link href="/dashboard/notifications">
              {t("seeAll")}
              <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A row on /dashboard/notifications: following it marks the notification read first. Rows without a link
 * become a "mark as read" button while unread, and plain text once read.
 */
export function NotificationLink({
  id,
  href,
  read,
  className,
  children,
}: {
  id: string;
  href: string | null;
  read: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT("notifications");
  const go = useGo();
  const [pending, startTransition] = useTransition();
  const target = safeHref(href);

  function markThen(next?: string) {
    startTransition(async () => {
      const res = await markNotificationRead(id);
      if (!res.ok) toast.error(res.error);
      if (next) go(next);
    });
  }

  if (target) {
    return (
      <Link
        href={target}
        aria-busy={pending || undefined}
        className={cn(className, pending && "opacity-70")}
        onClick={(e) => {
          if (read) return;
          // New tab / window: let the browser handle it and just record the read.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            markThen();
            return;
          }
          e.preventDefault();
          markThen(target);
        }}
      >
        {children}
      </Link>
    );
  }

  if (!read) {
    return (
      <button
        type="button"
        title={t("markRead")}
        disabled={pending}
        onClick={() => markThen()}
        className={cn("cursor-pointer", className, pending && "opacity-70")}
      >
        {children}
      </button>
    );
  }

  return <div className={className}>{children}</div>;
}

export function MarkAllReadButton({ className }: { className?: string }) {
  const t = useT("notifications");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          const res = await markAllNotificationsRead();
          if (res.ok) toast.success(t("allMarked"));
          else toast.error(res.error);
        })
      }
    >
      <CheckCheck />
      {t("markAllRead")}
    </Button>
  );
}
