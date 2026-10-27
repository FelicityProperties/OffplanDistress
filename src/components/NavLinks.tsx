"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { localePath, stripLocale } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/** The header's page links, in the page's language ("/deals" → "/ar/deals" on Arabic pages), the current one marked. */
export function NavLinks({
  items,
  className,
  linkClassName,
  activeClassName = "bg-accent text-foreground",
}: {
  items: { href: string; label: string }[];
  className?: string;
  linkClassName?: string;
  activeClassName?: string;
}) {
  const locale = useLocale();
  const pathname = stripLocale(usePathname() ?? "/");
  return (
    <nav className={className}>
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
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
