"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  ClipboardCheck,
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
} satisfies Record<string, LucideIcon>;

export type ShellItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number; exact?: boolean };

export function AppShell({ items, title, children }: { items: ShellItem[]; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
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
