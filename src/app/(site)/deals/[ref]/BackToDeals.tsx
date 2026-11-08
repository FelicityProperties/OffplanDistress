"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useLocale } from "@/i18n/client";
import { localePath, stripLocale } from "@/i18n/paths";

/** The deals list (with its filters, sort and page) this tab last opened a deal from, without the language prefix. */
const LIST_KEY = "od-deals-list";
const isList = (href: string) => /^\/deals(?:\?|$)/.test(href);

type NavigationEntry = { url: string | null };
type NavigationApi = { currentEntry: { index: number } | null; entries(): NavigationEntry[] };

/**
 * How far back the list is in this tab's history, if only deal pages lie between ("Back to deals" from a similar deal
 * goes straight back to the list): from the Navigation API where the browser has it, else -1 when this page was opened
 * from the list (the Referer) and nothing has moved the history since (an anchor link, say). 0 when it isn't there.
 */
function stepsBackToList(list: string, fromList: boolean, moved: boolean) {
  const nav = (window as Window & { navigation?: NavigationApi }).navigation;
  if (nav?.currentEntry && typeof nav.entries === "function") {
    const entries = nav.entries();
    for (let i = nav.currentEntry.index - 1; i >= 0; i--) {
      const url = entries[i]?.url ? new URL(entries[i].url as string) : null;
      if (!url || url.origin !== location.origin) return 0;
      if (url.pathname + url.search === list) return i - nav.currentEntry.index;
      if (!stripLocale(url.pathname).startsWith("/deals/")) return 0;
    }
    return 0;
  }
  return fromList && !moved && window.history.length > 1 ? -1 : 0;
}

/**
 * "Back to deals" that returns to the list as the visitor left it, filters and scroll position included, like an app's
 * back button: the browser's own back when the list is right behind this page, else a link to the list this tab last
 * opened a deal from, else /deals.
 */
export function BackToDeals({
  list,
  fromList,
  className,
  children,
}: {
  /** The page's Referer when it is this site's deals list ("/deals?type=1br", no language prefix), else null. */
  list: string | null;
  /** That list is in this page's language, so it is the history entry right behind this page. */
  fromList: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [href, setHref] = useState(list ?? "/deals");
  // An anchor link on the page (the cash timeline) adds a history entry: back would then stay on this page.
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    try {
      if (list) sessionStorage.setItem(LIST_KEY, list);
      const saved = list ?? sessionStorage.getItem(LIST_KEY);
      if (saved && isList(saved)) setHref(saved);
    } catch {}
  }, [list]);

  useEffect(() => {
    const onMove = () => setMoved(true);
    window.addEventListener("hashchange", onMove);
    return () => window.removeEventListener("hashchange", onMove);
  }, []);

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const steps = stepsBackToList(localePath(href, locale), fromList, moved);
        if (!steps) return;
        e.preventDefault();
        if (steps === -1) router.back();
        else window.history.go(steps);
      }}
    >
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      {children}
    </Link>
  );
}
