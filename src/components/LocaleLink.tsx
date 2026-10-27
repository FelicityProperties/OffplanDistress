"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "@/i18n/client";
import { localePath } from "@/i18n/paths";

/**
 * next/link in the page's language: a public path gets the /ar prefix on Arabic pages ("/deals" → "/ar/deals"); the
 * consoles (/dashboard, /admin), other sites and "#…" links are left alone. A drop-in for `import Link from
 * "next/link"` in Server and Client Components alike.
 */
export default function LocaleLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale();
  const target =
    typeof href === "string"
      ? localePath(href, locale)
      : href.pathname
        ? { ...href, pathname: localePath(href.pathname, locale) }
        : href;
  return <Link href={target} {...props} />;
}
