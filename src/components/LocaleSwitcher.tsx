"use client";

import { useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { isLocalizedPath, localePath, switchHref } from "@/i18n/paths";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Switching language. On a public page: remember the choice (od_locale + the account's email language), then open the
 * same page in the other language (/deals?… ⇄ /ar/deals?…, filters kept) with a full page load, so direction, fonts and
 * header change too. On the consoles (one address for both languages) the page re-renders in place. `href` is the
 * no-script link for the same switch (/ar/… or /en/…, which the proxy answers).
 */
export function useSwitchLocale() {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString() ?? "";
  const current = `${pathname}${search ? `?${search}` : ""}`;
  const localized = isLocalizedPath(pathname);
  return {
    localized,
    href: (to: Locale) => switchHref(current, to),
    go: async (to: Locale) => {
      try {
        await setLocale(to, !localized);
      } catch {
        // Offline or the action failed: the /ar/… or /en/… address alone still switches (the proxy remembers it).
        if (localized) window.location.assign(switchHref(current, to));
        return;
      }
      // Read the address now: the filters may have changed since the last render. The #section is kept too (section ids
      // are the same in both languages: a Terms clause, /market#methodology), so the reader stays where they were.
      const { pathname: path, search: query, hash } = window.location;
      if (localized) window.location.assign(localePath(`${path}${query}${hash}`, to));
    },
  };
}

/** `compact` hides the label below xl (icon only), so the desktop header fits on one line at 1024–1279px. */
export function LocaleSwitcher({ className, full, compact }: { className?: string; full?: boolean; compact?: boolean }) {
  const locale = useLocale();
  const t = useT("common");
  const [pending, start] = useTransition();
  const { go } = useSwitchLocale();
  const next = locale === "ar" ? "en" : "ar";
  const label = next === "ar" ? t("switchToArabic") : t("switchToEnglish");
  return (
    <Button
      type="button"
      variant="ghost"
      size={full ? "default" : "sm"}
      disabled={pending}
      onClick={() => start(() => go(next))}
      className={cn("gap-1.5", className)}
      title={compact ? label : undefined}
    >
      {/* Named by what it shows ("العربية" / "English", in that language) and then what it is, for voice control. */}
      <Languages aria-hidden />
      <span lang={next} className={compact ? "sr-only xl:not-sr-only" : undefined}>
        {label}
      </span>
      <span className="sr-only"> – {t("language")}</span>
    </Button>
  );
}
