"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  ChartColumn,
  ClipboardCheck,
  FileUp,
  Gavel,
  Heart,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  SearchCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard,
  listings: Building2,
  offers: Gavel,
  watchlist: Heart,
  // Saved searches get their own glyph so they don't read as a second notifications item.
  searches: SearchCheck,
  bell: Bell,
  profile: UserRound,
  queue: ClipboardCheck,
  inquiries: MessageSquare,
  users: Users,
  verified: BadgeCheck,
  inbox: Inbox,
  analytics: ChartColumn,
  upload: FileUp,
} satisfies Record<string, LucideIcon>;

export type ShellItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number; exact?: boolean };

export function AppShell({ items, title, children }: { items: ShellItem[]; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // Below lg the nav is one scrolling row: the current section is scrolled into view (else it can sit cut off at the end).
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const link = activeRef.current;
    const nav = link?.parentElement;
    if (!link || !nav || nav.scrollWidth <= nav.clientWidth) return;
    const l = link.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    if (l.left < n.left) nav.scrollBy({ left: l.left - n.left - 8 });
    else if (l.right > n.right) nav.scrollBy({ left: l.right - n.right + 8 });
  }, [pathname]);
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="lg:rounded-2xl lg:border lg:border-border/80 lg:bg-card lg:p-2 lg:shadow-card">
          <p className="mb-2 px-3 pt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  ref={active ? activeRef : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-ink-gradient text-primary-foreground shadow-card"
                      : "border border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground lg:border-transparent lg:bg-transparent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-start">{it.label}</span>
                  {it.count != null && it.count > 0 && (
                    <span className="rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground tabular">
                      {it.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
