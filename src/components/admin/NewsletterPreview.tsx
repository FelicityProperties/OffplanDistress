"use client";

import { useRef, useState, useTransition } from "react";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { previewIssueAction, sendTestIssueAction } from "@/app/actions/newsletter-issue";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/i18n/client";
import { dirOf, isLocale, LOCALES, type Locale } from "@/i18n/config";

type Preview = Awaited<ReturnType<typeof previewIssueAction>>;

/**
 * Today's newsletter issue on /admin/newsletter: what the next daily run would send (src/lib/newsletter-issue.ts),
 * in English, Arabic or Chinese, shown in an iframe sized to the email, with a test send to the admin's own address.
 */
export function NewsletterPreview() {
  const t = useT("newsletter");
  const [locale, setLocale] = useState<Locale>("en");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [height, setHeight] = useState(480);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);

  // Sized to the email, so the page scrolls rather than the frame; measured again a moment later for the thumbnails.
  const fit = () => {
    const doc = frame.current?.contentDocument?.documentElement;
    if (doc) setHeight(Math.max(240, doc.scrollHeight + 16));
  };

  const load = () =>
    startLoading(async () => {
      try {
        setPreview(await previewIssueAction(locale));
      } catch {
        toast.error(t("preview.failed"));
      }
    });
  const sendTest = () =>
    startSending(async () => {
      try {
        const res = await sendTestIssueAction(locale);
        if ("error" in res) toast.error(res.error);
        else toast.success(t("preview.testSent", { email: res.to }));
      } catch {
        toast.error(t("preview.testFailed"));
      }
    });

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6" data-testid="newsletter-preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("preview.title")}</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("preview.sub")}</p>
        </div>
        <ToggleGroup
          type="single"
          value={locale}
          onValueChange={(v) => {
            if (isLocale(v)) setLocale(v);
          }}
          aria-label={t("preview.language")}
          className="rounded-lg border border-input p-0.5"
        >
          {LOCALES.map((l) => (
            <ToggleGroupItem key={l} value={l} className="h-8 px-3 text-xs">
              {t(`admin.lang.${l}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={load} data-testid="newsletter-preview-load">
          <Eye aria-hidden /> {loading ? t("preview.loading") : t("preview.load")}
        </Button>
        <Button size="sm" variant="outline" disabled={sending} onClick={sendTest} data-testid="newsletter-send-test">
          <Send aria-hidden /> {sending ? t("preview.sending") : t("preview.sendTest")}
        </Button>
      </div>
      {preview && (
        <div className="mt-5 space-y-3" dir={dirOf(locale)}>
          <p className="text-sm">
            <span className="text-muted-foreground">{t("preview.subject")}: </span>
            <span className="font-semibold" data-testid="newsletter-preview-subject">
              {preview.subject}
            </span>
          </p>
          <p className="text-sm text-muted-foreground" data-testid="newsletter-preview-counts">
            {t("preview.counts", { n: preview.counts.newListings, m: preview.counts.priceDrops, k: preview.counts.gone })}
            {" · "}
            {t("preview.window", preview.window)}
          </p>
          {preview.quiet && <p className="text-sm text-muted-foreground">{t("preview.quiet")}</p>}
          <iframe
            ref={frame}
            title={t("preview.frame")}
            srcDoc={preview.html}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            style={{ height }}
            onLoad={() => {
              fit();
              setTimeout(fit, 600);
            }}
            className="w-full rounded-xl border border-border bg-[#faf8f3]"
            data-testid="newsletter-preview-frame"
          />
        </div>
      )}
    </section>
  );
}
