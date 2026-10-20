"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className, full }: { className?: string; full?: boolean }) {
  const locale = useLocale();
  const t = useT("common");
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      type="button"
      variant="ghost"
      size={full ? "default" : "sm"}
      disabled={pending}
      onClick={() => start(() => setLocale(next))}
      className={cn("gap-1.5", className)}
      aria-label={t("language")}
      lang={next}
    >
      <Languages />
      {next === "ar" ? t("switchToArabic") : t("switchToEnglish")}
    </Button>
  );
}
