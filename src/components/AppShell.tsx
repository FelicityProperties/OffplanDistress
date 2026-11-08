"use client";

import { useEffect, useId, useRef } from "react";
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
  Newspaper,
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
  newsletter: Newspaper,
} satisfies Record<string, LucideIcon>;

export type ShellItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number; exact?: boolean };

/**
 * Below lg, focused and anchored elements clear the section row too (it is 61px tall, under the header). A plain rule
 * while the shell is on the page, not html:has([data-shell-nav]), which restyled the whole page on any attribute change.
 */
const SCROLL_PAD = "@media screen and (max-width:1023.98px){html{scroll-padding-top:calc(var(--app-header-h) + 5rem)}}";

/** A page with no section of its own: a listing opened in the console belongs to the pipeline (its back link). */
function sectionOf(pathname: string) {
  return /^\/admin\/listings\/(?!import(?:\/|$))/.test(pathname) ? "/admin/pipeline" : pathname;
}

/**
 * The consoles' frame: their sections as a sidebar from lg. Below lg they are one row of pills that scrolls sideways,
 * kept under the header as the page scrolls and hidden with it (data-shell-nav: globals.css); the title above them
 * (the greeting, "Admin console") is left to screen readers there, so the page starts higher.
 */
export function AppShell({ items, title, children }: { items: ShellItem[]; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const here = sectionOf(pathname);
  // The title above the links names their navigation landmark, apart from the header's (src/components/NavLinks.tsx).
  const titleId = useId();
  // Below lg the nav is one scrolling row: the current section is scrolled into view (else it can sit cut off at the end).
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const link = activeRef.current;
    const nav = link?.parentElement;
    if (!link || !nav || nav.scrollWidth <= nav.clientWidth) return;
    const l = link.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    // Inside the row's padding, where its ends fade out.
    const s = getComputedStyle(nav);
    const left = n.left + parseFloat(s.paddingLeft);
    const right = n.right - parseFloat(s.paddingRight);
    if (l.left < left) nav.scrollBy({ left: l.left - left - 8 });
    else if (l.right > right) nav.scrollBy({ left: l.right - right + 8 });
  }, [pathname]);
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 pb-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:pt-8">
      <style>{SCROLL_PAD}</style>
      <aside
        data-shell-nav
        className="min-w-0 max-lg:border-b max-lg:border-border/60 max-lg:bg-background/95 max-lg:backdrop-blur-xl max-lg:backdrop-saturate-150 lg:sticky lg:top-24 lg:self-start"
      >
        <div className="lg:rounded-2xl lg:border lg:border-border/80 lg:bg-card lg:p-2 lg:shadow-card">
          <p id={titleId} className="mb-2 px-3 pt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground max-lg:sr-only">
            {title}
          </p>
          <nav aria-labelledby={titleId} className="flex gap-2 overflow-x-auto py-2 lg:flex-col lg:gap-1 lg:py-0">
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              const active = it.exact ? here === it.href : here === it.href || here.startsWith(`${it.href}/`);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  ref={active ? activeRef : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition max-lg:min-h-11",
                    active
                      ? "bg-ink-gradient text-primary-foreground shadow-card"
                      : "border border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground lg:border-transparent lg:bg-transparent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-start">{it.label}</span>
                  {it.count != null && it.count > 0 && (
                    <span className="rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground tabular max-lg:min-w-5 max-lg:text-center max-lg:text-xs max-lg:leading-5">
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
