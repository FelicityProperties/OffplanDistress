"use client";

import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { useDir, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Static class names so Tailwind sees them: thumbnails share the row (mobile) / column (desktop) evenly.
const COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;
const ROWS = { 2: "md:grid-rows-2", 3: "md:grid-rows-3", 4: "md:grid-rows-4" } as const;

// On phones the arrows sit side by side at the photo's bottom start corner, clear of the badges that wrap down from the
// top; from sm they are centred on each side.
const arrow =
  "absolute bottom-3 grid h-10 w-10 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 place-items-center rounded-full bg-ink/55 text-primary-foreground backdrop-blur transition-colors hover:bg-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

const viewerButton =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

/** Where a finger (touch or pen, never a mouse) went down on a photo. */
type Swipe = { id: number; x: number; y: number };

/** The gesture once the finger lifts: "x" across (over 40 px, clearly more across than down), "down", or null. */
function swipeOf(s: Swipe, e: React.PointerEvent) {
  const dx = e.clientX - s.x;
  const dy = e.clientY - s.y;
  if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) return { kind: "x" as const, dx };
  if (dy > 80 && dy > 1.5 * Math.abs(dx)) return { kind: "down" as const, dx };
  return null;
}

/**
 * The deal page's photos: the main one with up to four thumbnails beside it. Every photo is reachable — an import's
 * keyplan comes fifth and sellers may upload up to 20 — through previous / next on the main photo (and the arrow keys
 * from any of the gallery's buttons); with more than four, the last thumbnail says how many more there are. On a touch
 * screen a swipe across the photo changes it too; below lg a tap opens the photos full screen and uncropped (a floor
 * plan or keyplan is often portrait), to swipe through, zoom with two fingers and close with a swipe down.
 */
export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: React.ReactNode }) {
  const t = useT("deals");
  const td = useT("deal");
  const tc = useT("common");
  const rtl = useDir() === "rtl";
  const [img, setImg] = useState(0);
  const [viewer, setViewer] = useState(false);
  // The photo's own button opens the viewer (not a dialog trigger, for the swipe guard): closed, focus goes back to it.
  const opener = useRef<HTMLButtonElement>(null);
  const swipe = useRef<Swipe | null>(null);
  // When the last swipe ended: a click some browsers still send after it must not open the viewer.
  const swipedAt = useRef(-1e9);
  const thumbs = images.slice(0, 4);
  const n = thumbs.length as 2 | 3 | 4;
  const more = images.length - thumbs.length;
  const go = (step: number) => setImg((i) => (i + step + images.length) % images.length);
  // Swiping towards the start brings the next photo (leftwards in English, rightwards in Arabic), as the arrows are placed.
  const goSwiped = (dx: number) => go((dx < 0) !== rtl ? 1 : -1);
  const startSwipe = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" && e.isPrimary) swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  /** The gesture that just ended, if any. */
  const endSwipe = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    const gesture = s && s.id === e.pointerId ? swipeOf(s, e) : null;
    if (gesture) swipedAt.current = e.timeStamp;
    return gesture;
  };
  // Zoomed in with two fingers (the page's own pinch zoom): one finger then looks around, it doesn't swipe.
  const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
  return (
    <div
      className={cn(
        "mt-5 grid gap-3",
        thumbs.length > 1 && "md:grid-cols-[minmax(0,1fr)_10rem] md:gap-4 lg:grid-cols-[minmax(0,1fr)_12.5rem]",
      )}
      // Also gets the viewer's keys: React passes events up from the portal.
      onKeyDown={(e) => {
        // The start side is "previous" (the right in Arabic), as the arrow buttons are placed.
        if (images.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault();
        go((e.key === "ArrowRight") !== rtl ? 1 : -1);
      }}
    >
      <div
        className={cn(
          // touch-pan-y + pinch-zoom: scrolling and zooming stay the browser's, a move across is the swipe.
          "relative touch-pan-y touch-pinch-zoom overflow-hidden rounded-3xl bg-muted shadow-lift ring-1 ring-border/60",
          images.length ? "aspect-[16/10] lg:aspect-[16/9]" : "aspect-[21/9]",
        )}
        onPointerDown={images.length > 1 ? startSwipe : undefined}
        onPointerUp={(e) => {
          const gesture = endSwipe(e);
          if (gesture?.kind === "x" && !zoomed()) goSwiped(gesture.dx);
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <DealImage key={img} src={images[img]} alt={alt} priority={img === 0} className="animate-in fade-in duration-500" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-ink/25"
        />
        {images.length > 0 && (
          // Phones and tablets: the photo opens the viewer (under the badges, arrows and counter).
          <button
            ref={opener}
            type="button"
            onClick={(e) => e.timeStamp - swipedAt.current > 500 && setViewer(true)}
            aria-label={td("gallery.open")}
            aria-haspopup="dialog"
            className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold lg:hidden"
          />
        )}
        {badge}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t("gallery.previous")} className={cn(arrow, "start-3")}>
              <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t("gallery.next")} className={cn(arrow, "start-15 sm:start-auto sm:end-3")}>
              <ChevronRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            </button>
            <p
              aria-live="polite"
              data-gallery-position={img + 1}
              className="pointer-events-none absolute bottom-3 end-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur tabular"
            >
              <span className="sr-only">{t("gallery.position", { n: img + 1, total: images.length })}</span>
              <span aria-hidden dir="ltr">
                {img + 1} / {images.length}
              </span>
            </p>
          </>
        )}
      </div>
      {thumbs.length > 1 && (
        <div className={cn("grid gap-3 md:grid-cols-1 md:gap-4", COLS[n], ROWS[n])}>
          {thumbs.map((src, i) => {
            const active = img === i;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setImg(i)}
                aria-label={t("gallery.showPhoto", { n: i + 1 })}
                aria-pressed={active}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted transition-all duration-200 md:aspect-auto",
                  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
                  active
                    ? "shadow-gold ring-2 ring-gold ring-offset-2 ring-offset-background"
                    : "opacity-85 ring-1 ring-border/70 hover:opacity-100",
                )}
              >
                <DealImage
                  src={src}
                  alt=""
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                />
                {i === thumbs.length - 1 && more > 0 && (
                  <span
                    aria-hidden
                    dir="ltr"
                    className="absolute inset-0 grid place-items-center bg-ink/55 text-lg font-semibold text-primary-foreground tabular"
                  >
                    +{more}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {/* The full-screen viewer, on Radix's dialog itself (focus trap, Escape, a scroll lock that still lets two fingers
          zoom) rather than the site's DialogContent, which is a form sheet on phones. */}
      <DialogPrimitive.Root open={viewer} onOpenChange={setViewer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(e) => {
              // No trigger to return to (Radix's default would leave focus on the page itself).
              e.preventDefault();
              opener.current?.focus({ preventScroll: true });
            }}
            className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <p aria-live="polite" className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular">
                <span className="sr-only">{t("gallery.position", { n: img + 1, total: images.length })}</span>
                <span aria-hidden dir="ltr">
                  {img + 1} / {images.length}
                </span>
              </p>
              <DialogPrimitive.Close aria-label={tc("close")} title={tc("close")} className={viewerButton}>
                <X className="h-5 w-5" aria-hidden />
              </DialogPrimitive.Close>
            </div>
            {/* One finger is the viewer's (across: another photo; down: close), two zoom the page. */}
            <div
              className="relative min-h-0 flex-1 touch-pinch-zoom select-none"
              onPointerDown={startSwipe}
              onPointerUp={(e) => {
                const gesture = endSwipe(e);
                if (!gesture || zoomed()) return;
                if (gesture.kind === "x" && images.length > 1) goSwiped(gesture.dx);
                else if (gesture.kind === "down") setViewer(false);
              }}
              onPointerCancel={() => (swipe.current = null)}
            >
              <DealImage key={img} src={images[img]} alt={alt} priority className="object-contain animate-in fade-in duration-300" />
            </div>
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-6 px-3 py-3">
                <button type="button" onClick={() => go(-1)} aria-label={t("gallery.previous")} className={viewerButton}>
                  <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={t("gallery.next")} className={viewerButton}>
                  <ChevronRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
                </button>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
