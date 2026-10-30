"use client";

import { useTransition, type MouseEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { useDir, useLocale, useT } from "@/i18n/client";
import { htmlLang, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { isLocalizedPath, localePath, switchHref } from "@/i18n/paths";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Switching language. On a public page: remember the choice (od_locale + the account's email language), then open the
 * same page in the chosen language (/deals?… ⇄ /ar/deals?… ⇄ /zh/deals?…, filters kept) with a full page load, so
 * direction, fonts and header change too. On the consoles (one address in every language) the page re-renders in
 * place. `href` is the no-script link for the same switch (/ar/…, /zh/… or /en/…, which the proxy answers).
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
        // Offline or the action failed: the /ar/…, /zh/… or /en/… address alone still switches (the proxy remembers it).
        if (localized) window.location.assign(switchHref(current, to));
        return;
      }
      // Read the address now: the filters may have changed since the last render. The #section is kept too (section ids
      // are the same in every language: a Terms clause, /market#methodology), so the reader stays where they were.
      const { pathname: path, search: query, hash } = window.location;
      if (localized) window.location.assign(localePath(`${path}${query}${hash}`, to));
    },
  };
}

/** A plain click, as opposed to a modified one (⌘/ctrl/shift: a new tab or window), which keeps the link's own address. */
function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * The language menu: English / العربية / 中文 (each in itself: LOCALE_NAMES), the page's language marked. Every entry
 * is a real link to the page in that language (/ar/…, /zh/…, /en/…), so it works in a new tab and without script; a
 * plain click goes through useSwitchLocale() instead, which also remembers the choice for the account's emails.
 * `compact` hides the label below xl (icon only), so the desktop header fits on one line at 1024–1279px; `dense` (the
 * signed-in header, which also holds the admin link, the bell and the account button) keeps the icon alone up to 2xl;
 * `full` (the phone menu) lays the three languages out side by side instead of behind a second menu.
 */
export function LocaleSwitcher({ className, full, compact, dense }: { className?: string; full?: boolean; compact?: boolean; dense?: boolean }) {
  const locale = useLocale();
  const dir = useDir();
  const t = useT("common");
  const [pending, start] = useTransition();
  const { href, go } = useSwitchLocale();
  const pick = (e: MouseEvent, to: Locale) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    if (to === locale || pending) return;
    start(() => go(to));
  };

  if (full) {
    return (
      <nav aria-label={t("langMenu.choose")} className={cn("grid gap-2", className)}>
        <p className="text-xs font-medium text-muted-foreground">{t("langMenu.label")}</p>
        <ul className="flex flex-wrap gap-1.5">
          {LOCALES.map((l) => (
            <li key={l}>
              <a
                href={href(l)}
                hrefLang={htmlLang(l)}
                lang={l}
                aria-current={l === locale ? "true" : undefined}
                aria-disabled={pending || undefined}
                onClick={(e) => pick(e, l)}
                data-testid={`locale-link-${l}`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  l === locale ? "border-ink bg-ink text-primary-foreground" : "border-border/70 bg-card hover:bg-accent",
                )}
              >
                {l === locale && <Check className="size-3.5" aria-hidden />}
                {LOCALE_NAMES[l]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          className={cn("gap-1.5", className)}
          title={compact ? t("langMenu.label") : undefined}
          data-testid="locale-menu"
        >
          {/* Named by what it shows (the page's language, in itself) and then what it is, for voice control. */}
          <Languages aria-hidden />
          <span lang={locale} className={compact ? (dense ? "sr-only 2xl:not-sr-only" : "sr-only xl:not-sr-only") : undefined}>
            {LOCALE_NAMES[locale]}
          </span>
          <span className="sr-only"> – {t("langMenu.label")}</span>
          <ChevronDown aria-hidden className={cn("size-3.5 opacity-60", compact && (dense ? "max-2xl:hidden" : "max-xl:hidden"))} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        // Popper alignment is physical: the panel grows inwards from the header's end edge in both directions.
        align={dir === "rtl" ? "start" : "end"}
        collisionPadding={16}
        className="min-w-44"
        aria-label={t("langMenu.choose")}
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t("langMenu.choose")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} asChild className="cursor-pointer justify-between gap-3">
            <a
              href={href(l)}
              hrefLang={htmlLang(l)}
              lang={l}
              aria-current={l === locale ? "true" : undefined}
              onClick={(e) => pick(e, l)}
              data-testid={`locale-option-${l}`}
            >
              {LOCALE_NAMES[l]}
              {l === locale && <Check className="size-4" aria-hidden />}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
