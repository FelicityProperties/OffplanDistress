"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The deal page's action bar on phones and tablets (below lg): the price, WhatsApp and the main action, fixed at the
 * bottom like an app's buy bar. It steps aside while the price card's own buttons (`watchId`) are on screen and comes
 * back once they scroll away. It replaces the tab bar and the floating WhatsApp button there: globals.css hides those
 * while a [data-dealbar] exists and moves the chat button above it (--app-bottom).
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

  function toPrice() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(priceId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div
      data-dealbar
      data-state={shown ? "shown" : "hidden"}
      role="region"
      aria-label={t("dealBar.label")}
      // 4rem tall (--app-dealbar-h, the room globals.css keeps at the page's end): 1px border, 9px, 44px buttons, 10px.
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
  );
}
