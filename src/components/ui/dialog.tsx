"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

function CloseLabel() {
  const tc = useT("common");
  return <span className="sr-only">{tc("close")}</span>;
}

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Phones (below sm): a sheet from the bottom edge instead of the centred box, as native apps show a form; from sm up
 * nothing changes. Also used by AlertDialog (alert-dialog.tsx).
 */
const SHEET_ON_PHONES =
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[calc(100dvh-2.5rem)] max-sm:rounded-t-3xl max-sm:border-x-0 max-sm:border-b-0 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=closed]:zoom-out-100";

/** Touch screens: no keyboard over a form before it is read; the dialog itself takes focus (screen readers start there). */
function focusSheetOnTouch(e: Event, sheet: HTMLElement | null) {
  if (e.defaultPrevented || !window.matchMedia("(pointer: coarse)").matches) return;
  e.preventDefault();
  sheet?.focus({ preventScroll: true });
}

/** The sheet's handle on phones: drag it down to close (the backdrop, Escape and the X close it too). */
function SheetHandle({ sheet, closer }: { sheet: React.RefObject<HTMLElement | null>; closer: React.RefObject<HTMLButtonElement | null> }) {
  const drag = React.useRef<{ id: number; y: number; t: number; dy: number } | null>(null);
  const back = (el: HTMLElement) => {
    el.style.transition = "translate 200ms ease-out";
    el.style.translate = "";
    setTimeout(() => (el.style.transition = ""), 220);
  };
  return (
    <div
      aria-hidden
      className="flex h-6 shrink-0 touch-none items-end justify-center sm:hidden"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const el = sheet.current;
        if (!d || !el || d.id !== e.pointerId) return;
        d.dy = Math.max(0, e.clientY - d.y);
        el.style.transition = "none";
        el.style.translate = `0 ${d.dy}px`;
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        const el = sheet.current;
        drag.current = null;
        if (!d || !el || d.id !== e.pointerId) return;
        // Far enough, or a quick flick.
        if (d.dy > 80 || (d.dy > 24 && d.dy / Math.max(1, e.timeStamp - d.t) > 0.5)) {
          closer.current?.click();
          // A dialog that stays open (busy) slides back.
          requestAnimationFrame(() => el.getAttribute("data-state") === "open" && back(el));
        } else back(el);
      }}
      onPointerCancel={() => {
        drag.current = null;
        if (sheet.current) back(sheet.current);
      }}
    >
      <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onOpenAutoFocus, ...props }, ref) => {
  const sheet = React.useRef<HTMLDivElement | null>(null);
  const closer = React.useRef<HTMLButtonElement>(null);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      sheet.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setRef}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e);
          focusSheetOnTouch(e, sheet.current);
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden border bg-background shadow-lg outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
          SHEET_ON_PHONES,
          className,
        )}
        {...props}
      >
        <SheetHandle sheet={sheet} closer={closer} />
        {/* The content scrolls inside the box, so the close button above it never scrolls away. */}
        <div
          className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-6 max-sm:pt-3"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
        {/* Phones and other touch screens: a 44 px button. */}
        <DialogPrimitive.Close
          ref={closer}
          className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground max-sm:end-2 max-sm:top-2 max-sm:grid max-sm:size-11 max-sm:place-items-center max-sm:rounded-full max-sm:opacity-100 max-sm:active:bg-muted pointer-coarse:end-2 pointer-coarse:top-2 pointer-coarse:grid pointer-coarse:size-11 pointer-coarse:place-items-center pointer-coarse:rounded-full pointer-coarse:opacity-100 pointer-coarse:active:bg-muted"
        >
          <X className="h-4 w-4 max-sm:h-5 max-sm:w-5 pointer-coarse:h-5 pointer-coarse:w-5" />
          <CloseLabel />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Touch screens: the title stays clear of the 44 px close button.
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-start max-sm:px-8 sm:pointer-coarse:pe-10", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

// Phones: buttons stacked full width, 44 px tall, 8 px apart.
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end max-sm:*:min-h-11", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  SHEET_ON_PHONES,
};
