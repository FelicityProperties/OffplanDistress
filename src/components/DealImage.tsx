"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

/** Listing photo with a branded fallback when there's no image or it fails to load. */
export function DealImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can fail before React attaches onError, so check once on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={cn("relative grid h-full w-full place-items-center overflow-hidden bg-ink-gradient", className)}
        role="img"
        aria-label={alt}
      >
        <div aria-hidden className="absolute inset-0 bg-dots-dark opacity-40" />
        <div aria-hidden className="absolute inset-x-0 -bottom-1/3 mx-auto h-2/3 w-2/3 bg-glow-gold opacity-25" />
        <LogoMark tone="light" className="relative h-10 w-10 opacity-80" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
