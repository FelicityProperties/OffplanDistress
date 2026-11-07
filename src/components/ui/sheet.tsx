"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

function CloseLabel() {
  const tc = useT("common");
  return <span className="sr-only">{tc("close")}</span>;
}

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 overscroll-contain bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
        // Logical sides follow the page direction (Arabic pages mirror them).
        start:
          "inset-y-0 start-0 h-full w-3/4 border-e data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right sm:max-w-sm",
        end: "inset-y-0 end-0 h-full w-3/4 border-s data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "end",
    },
  },
);

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

/**
 * The p-6 padding, grown to clear the notch, the home indicator and a landscape phone's sides (viewport-fit=cover) on
 * the edges the sheet touches. Inline, so a caller's p-* class (DealFilters passes p-6) can't undo it.
 */
const SAFE_X = "max(1.5rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))";
const SAFE_TOP = "max(1.5rem, env(safe-area-inset-top, 0px))";
const SAFE_BOTTOM = "max(1.5rem, env(safe-area-inset-bottom, 0px))";
const SAFE_AREA: Record<NonNullable<SheetContentProps["side"]>, React.CSSProperties> = {
  top: { paddingTop: SAFE_TOP, paddingInline: SAFE_X },
  bottom: { paddingBottom: SAFE_BOTTOM, paddingInline: SAFE_X },
  left: { paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM, paddingLeft: SAFE_X },
  right: { paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM, paddingRight: SAFE_X },
  start: { paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM, paddingInlineStart: SAFE_X },
  end: { paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM, paddingInlineEnd: SAFE_X },
};
/** The close button sits 1rem above the padded content, and clear of a screen edge it shares with the sheet. */
function closePlace(side: NonNullable<SheetContentProps["side"]>): React.CSSProperties {
  return {
    top: side === "bottom" ? "0.5rem" : "max(0.5rem, calc(env(safe-area-inset-top, 0px) - 1rem))",
    insetInlineEnd:
      side === "start" || side === "left" ? "0.5rem" : "max(0.5rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))",
  };
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, style, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      style={{ ...SAFE_AREA[side ?? "right"], ...style }}
      {...props}
    >
      {/* A 44px target; its ring only for the keyboard (Radix focuses it when the sheet opens, a tap included). */}
      <SheetPrimitive.Close
        className="absolute grid h-11 w-11 cursor-pointer place-items-center rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
        style={closePlace(side ?? "right")}
      >
        <X className="h-5 w-5" />
        <CloseLabel />
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-start", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
