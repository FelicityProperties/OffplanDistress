"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { claimLink } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

/**
 * "Send claim link" on a staff-created listing (src/lib/claim.ts): by email when the seller has a real address and
 * email is set up, or copied for WhatsApp, with a chat to the seller's number that already holds the message.
 * Every new link cancels the previous one.
 */
export function ClaimLinkButtons({ listingId, sellerName, canEmail }: { listingId: string; sellerName: string; canEmail: boolean }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url: string; whatsapp: string | null } | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {canEmail && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await claimLink(listingId, "email");
              if ("error" in res) toast.error(res.error);
              else toast.success(t("claim.emailed"));
            })
          }
        >
          <Mail aria-hidden /> {t("claim.email")}
        </Button>
      )}
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await claimLink(listingId, "copy");
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            const url = "url" in res ? res.url : undefined;
            if (!url) return;
            setLink({ url, whatsapp: ("whatsapp" in res && res.whatsapp) || null });
            try {
              await navigator.clipboard.writeText(url);
              toast.success(t("claim.copied"));
            } catch {
              toast(t("claim.copyFailed"));
            }
          })
        }
      >
        <Copy aria-hidden /> {t("claim.copy")}
      </Button>
      <Dialog open={!!link} onOpenChange={(open) => !open && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("claim.dialogTitle", { name: sellerName })}</DialogTitle>
            <DialogDescription>{t("claim.dialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="claim-url" className="text-sm font-medium">
              {t("claim.linkLabel")}
            </label>
            <Input
              id="claim-url"
              readOnly
              dir="ltr"
              value={link?.url ?? ""}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
          </div>
          {link?.whatsapp && (
            <Button asChild className="w-full sm:w-auto">
              <a href={link.whatsapp} target="_blank" rel="noopener noreferrer" data-testid="claim-whatsapp">
                <MessageCircle aria-hidden /> {t("claim.openWhatsApp")}
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
