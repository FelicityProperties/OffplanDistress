"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Ellipsis, Share, SquarePlus, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { richText } from "@/content/legal/rich-text";
import { useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";
import {
  INSTALL_OPEN_EVENT,
  installServerSnapshot,
  installSnapshot,
  isStandalone,
  promptInstall,
  readInstallMemory,
  rememberDismissal,
  subscribeInstall,
} from "@/lib/install-prompt";

// The install card on phones: an Install button for Chrome's own dialog on Android, the Share > Add to Home Screen steps
// in iOS Safari (src/lib/install-prompt.ts). Offered after some browsing in this tab (3 pages and 45 seconds), on pages
// where it interrupts nothing, at most once a visit, never in the installed app, and twice ever, 30 days apart, if
// turned down. The menu's "Install the app" (InstallMenuItem.tsx) opens it at any time. While it is up the floating
// buttons step aside and FeliBot's hello waits (html[data-install-prompt]: globals.css, AssistantWidget.tsx).

const PHONE = "(max-width: 1023.98px) and (pointer: coarse)";
/** Browsing pages (paths without the language prefix): never a deal page, a form, login or the admin console. */
const PAGES = new Set([
  "/",
  "/deals",
  "/market",
  "/how-it-works",
  "/fees",
  "/dashboard",
  "/dashboard/watchlist",
  "/dashboard/searches",
  "/dashboard/offers",
  "/dashboard/notifications",
]);
/** sessionStorage: when this tab's visit began and how many pages it has shown. */
const ENGAGE_KEY = "od-engage";
/** sessionStorage: the card was offered in this tab already. */
const SHOWN_KEY = "od-install-shown";
const MIN_VIEWS = 3;
const MIN_TIME = 45_000;
const MAX_DISMISSALS = 2;
const RETRY_AFTER = 30 * 24 * 60 * 60 * 1000;
/** A new page settles first (and opens what it opens itself) before the card may come. */
const SETTLE = 2000;
const ICON = "mx-0.5 inline-block h-4 w-4 align-[-0.2em] text-foreground";

function countView() {
  try {
    const visit = JSON.parse(sessionStorage.getItem(ENGAGE_KEY) ?? "null");
    const start = typeof visit?.start === "number" ? visit.start : Date.now();
    const views = (typeof visit?.views === "number" ? visit.views : 0) + 1;
    sessionStorage.setItem(ENGAGE_KEY, JSON.stringify({ start, views }));
  } catch {}
}

function engaged() {
  try {
    const visit = JSON.parse(sessionStorage.getItem(ENGAGE_KEY) ?? "null");
    return visit?.views >= MIN_VIEWS && Date.now() - visit.start >= MIN_TIME && !sessionStorage.getItem(SHOWN_KEY);
  } catch {
    return false;
  }
}

/** Something else has the screen (or the card couldn't do anything now): the card waits for another page. */
function screenBusy() {
  return (
    document.hidden ||
    !navigator.onLine ||
    document.documentElement.hasAttribute("data-keyboard") ||
    !!document.querySelector(
      '[data-lang-bar], [data-assistant="nudge"], [data-assistant="panel"], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    )
  );
}

function mayOffer(path: string) {
  if (!window.matchMedia(PHONE).matches || isStandalone() || !PAGES.has(stripLocale(path))) return false;
  const memory = readInstallMemory();
  if (memory.installed || (Number(memory.dismissals) || 0) >= MAX_DISMISSALS) return false;
  if (memory.dismissedAt && Date.now() - memory.dismissedAt < RETRY_AFTER) return false;
  return engaged() && !screenBusy();
}

export function InstallPrompt() {
  const t = useT("app");
  const tc = useT("common");
  const pathname = usePathname();
  const titleId = useId();
  const { platform, standalone } = useSyncExternalStore(subscribeInstall, installSnapshot, installServerSnapshot);
  // The page the card opened on (null: closed). Another page closes it, which is not a "no": nothing is remembered.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && (openOn !== pathname || !platform || standalone)) setOpenOn(null);

  // Each page shown in this tab counts towards "some browsing".
  useEffect(() => countView(), [pathname]);

  // A moment after each page, and when Chrome makes its offer: the card, if everything above allows it.
  useEffect(() => {
    if (!platform || standalone) return;
    const timer = setTimeout(() => {
      if (!mayOffer(pathname)) return;
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {}
      setOpenOn(pathname);
    }, SETTLE);
    return () => clearTimeout(timer);
  }, [pathname, platform, standalone]);

  // The menu's "Install the app": now, on any page, however often it was turned down. Asked for, the card takes focus
  // once it is on screen and the menu has let go of it (its title is read out, its steps follow); the menu, closing,
  // leaves focus there (MobileMenu.tsx).
  const [asked, setAsked] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const open = () => {
      if (!platform || isStandalone()) return;
      setOpenOn(pathname);
      setAsked((n) => n + 1);
    };
    window.addEventListener(INSTALL_OPEN_EVENT, open);
    return () => window.removeEventListener(INSTALL_OPEN_EVENT, open);
  }, [pathname, platform]);

  useEffect(() => {
    if (asked) titleRef.current?.focus({ preventScroll: true });
  }, [asked]);

  const open = openOn !== null;
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute("data-install-prompt", "");
    return () => root.removeAttribute("data-install-prompt");
  }, [open]);

  if (!open || !platform) return null;
  const ios = platform === "ios";
  const dismiss = () => {
    rememberDismissal();
    setOpenOn(null);
  };
  const install = () => {
    setOpenOn(null);
    // Chrome's dialog takes over; its answer is remembered there (src/lib/install-prompt.ts).
    void promptInstall();
  };

  return (
    // Not focused when it appears by itself (it must not steal the page's focus), only when asked for from the menu;
    // hidden while the keyboard is up.
    <section
      role="region"
      aria-labelledby={titleId}
      data-install-card=""
      className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-4 shadow-lift animate-in fade-in slide-in-from-bottom-4 duration-300 lg:hidden print:hidden [html[data-keyboard]_&]:invisible"
      style={{ bottom: "calc(var(--app-bottom, env(safe-area-inset-bottom, 0px)) + 0.75rem)" }}
    >
      <div className="flex items-start gap-3">
        <LogoMark className="h-11 w-11" />
        <div className="min-w-0 flex-1 pt-0.5">
          {/* Clear of the close button in the corner; a Chinese word (应用) is never split across lines. */}
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-balance break-keep pe-9 text-base font-semibold leading-snug outline-none">
            {ios ? t("install.iosTitle") : t("install.title")}
          </h2>
          {ios ? (
            <ol className="mt-1.5 grid gap-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                {richText(t("install.iosStep1"), {
                  share: <Share className={ICON} aria-hidden />,
                  // Safari's "…" (More) button: the word itself is not in the sentence.
                  more: (
                    <>
                      <Ellipsis className={ICON} aria-hidden />
                      <span className="sr-only">…</span>
                    </>
                  ),
                })}
              </li>
              <li>{richText(t("install.iosStep2"), { add: <SquarePlus className={ICON} aria-hidden /> })}</li>
            </ol>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("install.body")}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {ios ? (
          <Button className="h-11 rounded-full px-6" onClick={dismiss}>
            {t("install.iosDone")}
          </Button>
        ) : (
          <>
            <Button variant="outline" className="h-11 rounded-full px-5" onClick={dismiss}>
              {t("install.later")}
            </Button>
            <Button className="h-11 rounded-full px-6" onClick={install}>
              {t("install.cta")}
            </Button>
          </>
        )}
      </div>
      {/* In the corner rather than a column of its own: the text keeps the card's width on a 320px phone. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={tc("close")}
        title={tc("close")}
        className="absolute end-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </section>
  );
}
