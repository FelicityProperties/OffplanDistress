"use client";

import { useState, useTransition } from "react";
import { Languages, X } from "lucide-react";
import { useSwitchLocale } from "@/components/LocaleSwitcher";
import { setLocale } from "@/i18n/actions";
import { dirOf, htmlLang, type Locale } from "@/i18n/config";

export type LanguageBarCopy = { label: string; body: string; cta: string; dismiss: string };

/**
 * The bar's own face when its language isn't the page's: the Arabic faces (declared on <html>) for an Arabic bar, the
 * system's Chinese faces for a Chinese one (the same stack as globals.css gives zh-CN pages); tracking off for both.
 */
const BAR_STYLE: Partial<Record<Locale, React.CSSProperties>> = {
  ar: { fontFamily: "var(--font-arabic), ui-sans-serif, system-ui, sans-serif", letterSpacing: 0 },
  zh: {
    fontFamily: 'var(--font-inter), "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif',
    letterSpacing: 0,
  },
};

/**
 * "View in English" on an Arabic page, "عرض بالعربية" or "查看中文版" on an English one: offered when the browser
 * prefers another language and the visitor hasn't chosen yet (src/i18n/server.ts offeredLocale). Written in the
 * language it offers. The link opens the same page (filters kept) in that language; dismissing keeps the page's
 * language (od_locale), so the bar doesn't come back.
 */
export function LanguageBar({ to, current, copy }: { to: Locale; current: Locale; copy: LanguageBarCopy }) {
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  const { href, go } = useSwitchLocale();
  if (!open) return null;
  return (
    <div
      role="region"
      aria-label={copy.label}
      lang={htmlLang(to)}
      dir={dirOf(to)}
      data-lang-bar={to}
      style={BAR_STYLE[to]}
      className="border-b border-gold/30 bg-gold-soft text-gold-foreground"
    >
      <div className="container-page flex min-h-11 items-center gap-3 py-1.5 text-sm">
        <Languages className="h-4 w-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          {copy.body}{" "}
          <a
            href={href(to)}
            hrefLang={htmlLang(to)}
            aria-disabled={pending || undefined}
            className="whitespace-nowrap rounded-sm font-semibold text-foreground underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              if (!pending) start(() => go(to));
            }}
          >
            {copy.cta}
          </a>
        </p>
        <button
          type="button"
          aria-label={copy.dismiss}
          title={copy.dismiss}
          className="-me-2 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setOpen(false);
            start(async () => {
              try {
                // This browser only: closing a suggestion is not a choice of language for the account's emails.
                await setLocale(current, false, false);
              } catch {}
            });
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
