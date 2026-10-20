"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({
  items,
  className,
  linkClassName,
}: {
  items: { href: string; label: string }[];
  className?: string;
  linkClassName?: string;
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
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground",
              linkClassName,
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
