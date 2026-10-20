"use client";

import { useState } from "react";
import { DealImage } from "@/components/DealImage";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: React.ReactNode }) {
  const [img, setImg] = useState(0);
  const thumbs = images.slice(0, 4);
  return (
    <div className={cn("mt-4 grid gap-3", thumbs.length > 1 && "md:grid-cols-[1fr_180px]")}>
      <div className={cn("relative overflow-hidden rounded-2xl bg-muted", images.length ? "aspect-[16/10]" : "aspect-[21/9]")}>
        <DealImage src={images[img]} alt={alt} />
        {badge}
      </div>
      {thumbs.length > 1 && (
        <div className="flex gap-3 md:flex-col">
          {thumbs.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setImg(i)}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                "aspect-[4/3] flex-1 overflow-hidden rounded-xl ring-2 ring-transparent transition",
                img === i && "ring-gold",
              )}
            >
              <DealImage src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
