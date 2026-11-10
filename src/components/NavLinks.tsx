"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { localePath, stripLocale } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/**
 * The header's page links, in the page's language ("/deals" → "/ar/deals" on Arabic pages), the current one marked.
 * `label` names the navigation landmark, apart from the consoles' own (src/components/AppShell.tsx). An item's `also`:
 * other sections it stands for ("/projects" under Browse deals), marked current there too.
 */
export function NavLinks({
  items,
  label,
  className,
  linkClassName,
  activeClassName = "bg-accent text-foreground",
}: {
  items: { href: string; label: string; also?: string[] }[];
  label?: string;
  className?: string;
  linkClassName?: string;
  activeClassName?: string;
}) {
  const locale = useLocale();
  const pathname = stripLocale(usePathname() ?? "/");
  return (
    <nav aria-label={label} className={className}>
      {items.map((n) => {
        const active = [n.href, ...(n.also ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={n.href}
            href={localePath(n.href, locale)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              linkClassName,
              active && activeClassName,
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
