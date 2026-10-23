"use client";

import { useState } from "react";
import { DealImage } from "@/components/DealImage";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Static class names so Tailwind sees them: thumbnails share the row (mobile) / column (desktop) evenly.
const COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;
const ROWS = { 2: "md:grid-rows-2", 3: "md:grid-rows-3", 4: "md:grid-rows-4" } as const;

export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: React.ReactNode }) {
  const t = useT("deals");
  const [img, setImg] = useState(0);
  const thumbs = images.slice(0, 4);
  const n = thumbs.length as 2 | 3 | 4;
  return (
    <div
      className={cn(
        "mt-5 grid gap-3",
        thumbs.length > 1 && "md:grid-cols-[minmax(0,1fr)_10rem] md:gap-4 lg:grid-cols-[minmax(0,1fr)_12.5rem]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-muted shadow-lift ring-1 ring-border/60",
          images.length ? "aspect-[16/10] lg:aspect-[16/9]" : "aspect-[21/9]",
        )}
      >
        <DealImage key={img} src={images[img]} alt={alt} className="animate-in fade-in duration-500" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-ink/25"
        />
        {badge}
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
