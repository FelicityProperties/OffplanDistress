"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/**
 * `thumbLabels`: one name per thumb (a range's "minimum" and "maximum"), else every thumb takes `aria-label`.
 * `valueText`: what a screen reader says for a thumb's value (aria-valuetext), as the screen shows it.
 *
 * Touch: only a thumb starts a drag (sideways), and a vertical swipe over the slider, even one that starts on a thumb,
 * scrolls the page or the sheet it sits in, so a finger that passes over it while scrolling sets nothing. A mouse or a
 * pen works as before (a click on the track jumps there).
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { thumbLabels?: string[]; valueText?: (value: number) => string }
>(({ className, thumbLabels, valueText, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props }, ref) => {
  const values = props.value ?? props.defaultValue ?? [0];
  const thumbs = values.length;
  // The values a touch drag started from: when the browser takes the gesture over to scroll (pointercancel), Radix has
  // already moved the thumb a little and commits nothing, so a controlled slider is put back.
  const dragStart = React.useRef<number[] | null>(null);
  // A touch that landed on the track rather than a thumb: left to scrolling.
  const passed = React.useRef<number | null>(null);
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-pan-y select-none items-center", className)}
      {...props}
      // Radix skips its own handler for an event a caller has defaultPrevented.
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.pointerType !== "touch") return;
        const target = e.target as Element;
        if (target.closest('[role="slider"]')) {
          dragStart.current = values;
          return;
        }
        passed.current = e.pointerId;
        e.preventDefault();
        // A touch is captured by what it lands on, and Radix reads a captured pointer's moves as a drag.
        if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (e.pointerId === passed.current) e.preventDefault();
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        if (e.pointerId === passed.current) e.preventDefault();
        passed.current = null;
        dragStart.current = null;
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        if (dragStart.current) props.onValueChange?.(dragStart.current);
        passed.current = null;
        dragStart.current = null;
      }}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbs }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels?.[i] ?? props["aria-label"]}
          aria-valuetext={valueText && values[i] != null ? valueText(values[i]) : undefined}
          aria-describedby={props["aria-describedby"]}
          className={cn(
            "relative block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            // Touch screens: a 20px thumb with a 44px target around it (the only place a drag can start).
            "pointer-coarse:h-5 pointer-coarse:w-5 pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:rounded-full pointer-coarse:after:content-['']",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
