"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** `compact` hides the label below xl (icon only), so the desktop header fits on one line at 1024–1279px. */
export function LocaleSwitcher({ className, full, compact }: { className?: string; full?: boolean; compact?: boolean }) {
  const locale = useLocale();
  const t = useT("common");
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  const label = next === "ar" ? t("switchToArabic") : t("switchToEnglish");
  return (
    <Button
      type="button"
      variant="ghost"
      size={full ? "default" : "sm"}
      disabled={pending}
      onClick={() => start(() => setLocale(next))}
      className={cn("gap-1.5", className)}
      aria-label={t("language")}
      title={compact ? label : undefined}
      lang={next}
    >
      <Languages />
      {compact ? <span className="hidden xl:inline">{label}</span> : label}
    </Button>
  );
}
