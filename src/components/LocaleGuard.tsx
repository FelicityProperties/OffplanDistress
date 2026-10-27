"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { isLocalizedPath, localeOfPath } from "@/i18n/paths";

/**
 * The root layout (<html lang dir> and the translations of every Client Component) is rendered once per page load and
 * kept across in-app navigation. A public page's language comes from its address (/ar/… or the plain one, English),
 * a console's from the visitor's saved choice, else the browser's language (src/i18n/server.ts). So an in-app move
 * between the two, by a visitor with an Arabic browser and no saved choice, could show a page in one language inside
 * the other's frame (Arabic text in a left-to-right English page). This loads such a page again, whole, in its own
 * language.
 *
 * `locale`: the language the server rendered this console in (dashboard and admin layouts). Without it (the root
 * layout), a public page's language is read from its address.
 */
export function LocaleGuard({ locale }: { locale?: Locale }) {
  const shell = useLocale();
  const pathname = usePathname();
  useEffect(() => {
    const expected = locale ?? (pathname && isLocalizedPath(pathname) ? (localeOfPath(pathname) ?? "en") : null);
    if (!expected) return;
    // At most one reload per address until it renders in its own language: never a reload loop.
    const key = `od_locale_reload:${window.location.pathname}`;
    try {
      if (expected === shell) {
        sessionStorage.removeItem(key);
        return;
      }
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, expected);
    } catch {
      return;
    }
    window.location.reload();
  }, [locale, pathname, shell]);
  return null;
}
