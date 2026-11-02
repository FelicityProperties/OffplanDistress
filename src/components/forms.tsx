"use client";

import { Children, cloneElement, isValidElement } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  messageId,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string[] | string;
  hint?: string;
  className?: string;
  /** An id for the error (or hint) line; `${htmlFor}-msg` when not given. */
  messageId?: string;
  children: React.ReactNode;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  const lineId = messageId ?? (htmlFor ? `${htmlFor}-msg` : undefined);
  // The control (the child whose id is htmlFor) is marked invalid and described by the error or hint line, so a screen
  // reader reads them with it; a control that sets its own aria-invalid / aria-describedby keeps them.
  const wired = Children.map(children, (child) => {
    if (!htmlFor || !isValidElement<Record<string, unknown>>(child) || child.props.id !== htmlFor) return child;
    return cloneElement(child, {
      "aria-invalid": child.props["aria-invalid"] ?? (msg ? true : undefined),
      "aria-describedby": child.props["aria-describedby"] ?? (msg || hint ? lineId : undefined),
    });
  });
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {wired}
      {msg ? (
        <p id={lineId} className="text-xs font-medium text-destructive">
          {msg}
        </p>
      ) : hint ? (
        <p id={lineId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: boolean } | undefined; okText?: string }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.error}
    </p>
  );
}

