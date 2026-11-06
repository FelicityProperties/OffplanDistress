"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";

const LABEL: Record<Locale, string> = { en: "EN", ar: "عربي", zh: "中文" };

/**
 * Copy buttons for a ready WhatsApp post (src/lib/whatsapp-post.ts), one per site language, with a preview of the post
 * in the admin's own language.
 */
export function WhatsAppCopy({ texts, title }: { texts: Record<Locale, string>; title?: string }) {
  const t = useT("admin");
  const locale = useLocale();
  const label = title ?? t("wa.copy");

  const copy = async (l: Locale) => {
    try {
      await navigator.clipboard.writeText(texts[l]);
      toast.success(t("wa.copied"));
    } catch {
      // Without the clipboard API (an older browser, or a page not served over https): a hidden text area.
      const area = document.createElement("textarea");
      area.value = texts[l];
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (ok) toast.success(t("wa.copied"));
      else toast.error(t("wa.copyFailed"));
    }
  };

  return (
    <div className="space-y-2" data-testid="wa-copy">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <MessageCircle className="h-4 w-4" aria-hidden /> {label}
        </span>
        {LOCALES.map((l) => (
          <Button key={l} type="button" size="sm" variant="outline" lang={l} onClick={() => copy(l)} aria-label={`${label}: ${LABEL[l]}`}>
            {LABEL[l]}
          </Button>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("wa.preview")}</summary>
        <pre dir="auto" lang={locale} className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-sans text-xs wrap-anywhere">
          {texts[locale]}
        </pre>
      </details>
    </div>
  );
}
