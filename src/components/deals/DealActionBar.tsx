"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * While the bar is on the page, below lg (the app shell, globals.css): it replaces the tab bar and the floating WhatsApp
 * button (it has its own), the page keeps its room at the end and the chat button sits above it. Plain rules on the
 * root from the first paint, outranking the tab bar's (MobileTabBar.tsx), never an html:has() rule: those made every
 * attribute change anywhere restyle the whole page.
 */
const ROOM =
  "@media screen and (max-width:1023.98px){:root:root{--app-bottom:calc(var(--app-dealbar-h) + var(--app-safe-b));--app-bottom-reserve:calc(var(--app-dealbar-h) + var(--app-safe-b));--fab-wa-slot:0px}[data-tabbar],[data-wa=floating]{display:none}}";

/**
 * The deal page's action bar on phones and tablets (below lg): the price, WhatsApp and the main action, fixed at the
 * bottom like an app's buy bar. It steps aside while the price card's own buttons (`watchId`) are on screen and comes
 * back once they scroll away; then html[data-dealbar-hidden] brings the floating buttons down (globals.css), without
 * a root variable changing as the page scrolls. The page renders it outside its own stacking context, so it stays
 * above the footer.
 */
export function DealActionBar({
  watchId,
  priceId,
  price,
  priceCompact,
  note,
  noteIsDiscount,
  whatsapp,
  cta,
}: {
  /** The price card's button group: the bar hides while it is on screen. */
  watchId: string;
  /** The price card: where a tap on the price goes. */
  priceId: string;
  price: string;
  /** The price on the narrowest phones (below 360 px): "AED 1.72M". */
  priceCompact: string;
  /** The line under the price: the discount, or what the price is. */
  note: string | null;
  noteIsDiscount: boolean;
  whatsapp: { href: string; label: string } | null;
  /** The main action (make an offer, or follow your deal). */
  cta: React.ReactNode;
}) {
  const t = useT("app");
  // Shown from the first paint (the card's buttons start below the fold), so the page keeps its room for it at once.
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    // Hidden while any part of the button group is above the bottom 96 px of the screen (where the bar would cover it).
    const io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), { rootMargin: "0px 0px -96px 0px" });
    io.observe(target);
    return () => io.disconnect();
  }, [watchId]);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-dealbar-hidden", !shown);
    return () => root.removeAttribute("data-dealbar-hidden");
  }, [shown]);

  function toPrice() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(priceId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <>
      <style>{ROOM}</style>
      <div
        data-dealbar
        data-state={shown ? "shown" : "hidden"}
        role="region"
        aria-label={t("dealBar.label")}
        // 4rem tall (--app-dealbar-h, the room ROOM keeps at the page's end): 1px border, 9px, 44px buttons, 10px.
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border/70 bg-background/95 pt-[0.5625rem] shadow-[0_-8px_24px_-16px_oklch(0.24_0.06_262/0.35)] backdrop-blur-xl transition-[transform,visibility] duration-200 data-[state=hidden]:invisible data-[state=hidden]:translate-y-full motion-reduce:transition-none lg:hidden print:hidden"
        style={{
          paddingBottom: "calc(0.625rem + var(--app-safe-b, env(safe-area-inset-bottom, 0px)))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <button
          type="button"
          onClick={toPrice}
          className="flex min-w-0 flex-1 flex-col items-start rounded-lg py-0.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:opacity-70"
        >
          <span className="block max-w-full truncate font-display text-lg font-semibold leading-tight tabular max-[359px]:hidden">{price}</span>
          <span className="block max-w-full truncate font-display text-base font-semibold leading-tight tabular min-[360px]:hidden">
            {priceCompact}
          </span>
          {note && (
            <span className={cn("block max-w-full truncate text-xs font-semibold leading-snug", noteIsDiscount ? "text-success" : "text-muted-foreground")}>
              {note}
            </span>
          )}
          <span className="sr-only">{t("dealBar.priceDetails")}</span>
        </button>
        {whatsapp && (
          <a
            href={whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            data-wa="deal"
            aria-label={whatsapp.label}
            title={whatsapp.label}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-[#1DA851] shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
          </a>
        )}
        <div className="shrink-0">{cta}</div>
      </div>
    </>
  );
}
