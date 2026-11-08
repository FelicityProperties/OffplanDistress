"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Share a page: the phone's own share sheet (WhatsApp, Messages, AirDrop…) where the browser has one, otherwise the
 * link is copied (with a toast); if even that is refused, a prompt shows the link to copy by hand.
 */
export function ShareButton({ url, title, text, className }: { url: string; title: string; text?: string; className?: string }) {
  const t = useT("app");

  async function share() {
    const data: ShareData = { title, text, url };
    if (typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        // The visitor closed the sheet: nothing to do. Any other refusal falls back to copying.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.copied"));
    } catch {
      window.prompt(t("share.copyPrompt"), url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t("share.label")}
      title={t("share.label")}
      className={cn(
        "grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-ink/5 backdrop-blur transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        className,
      )}
    >
      <Share className="h-4 w-4" aria-hidden />
    </button>
  );
}
