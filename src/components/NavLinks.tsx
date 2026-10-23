"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname();
  return (
    <nav className={className}>
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
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
