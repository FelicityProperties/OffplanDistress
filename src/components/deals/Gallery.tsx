"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { useDir, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Static class names so Tailwind sees them: thumbnails share the row (mobile) / column (desktop) evenly.
const COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;
const ROWS = { 2: "md:grid-rows-2", 3: "md:grid-rows-3", 4: "md:grid-rows-4" } as const;

const arrow =
  "absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink/55 text-primary-foreground backdrop-blur transition-colors hover:bg-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

/**
 * The deal page's photos: the main one with up to four thumbnails beside it. Every photo is reachable — an import's
 * keyplan comes fifth and sellers may upload up to 20 — through previous / next on the main photo (and the arrow keys
 * from any of the gallery's buttons); with more than four, the last thumbnail says how many more there are.
 */
export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: React.ReactNode }) {
  const t = useT("deals");
  const rtl = useDir() === "rtl";
  const [img, setImg] = useState(0);
  const thumbs = images.slice(0, 4);
  const n = thumbs.length as 2 | 3 | 4;
  const more = images.length - thumbs.length;
  const go = (step: number) => setImg((i) => (i + step + images.length) % images.length);
  return (
    <div
      className={cn(
        "mt-5 grid gap-3",
        thumbs.length > 1 && "md:grid-cols-[minmax(0,1fr)_10rem] md:gap-4 lg:grid-cols-[minmax(0,1fr)_12.5rem]",
      )}
      onKeyDown={(e) => {
        // The start side is "previous" (the right in Arabic), as the arrow buttons are placed.
        if (images.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault();
        go((e.key === "ArrowRight") !== rtl ? 1 : -1);
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-muted shadow-lift ring-1 ring-border/60",
          images.length ? "aspect-[16/10] lg:aspect-[16/9]" : "aspect-[21/9]",
        )}
      >
        <DealImage key={img} src={images[img]} alt={alt} priority={img === 0} className="animate-in fade-in duration-500" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-ink/25"
        />
        {badge}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t("gallery.previous")} className={cn(arrow, "start-3")}>
              <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t("gallery.next")} className={cn(arrow, "end-3")}>
              <ChevronRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            </button>
            <p
              aria-live="polite"
              data-gallery-position={img + 1}
              className="absolute bottom-3 end-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur tabular"
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
    </div>
  );
}
