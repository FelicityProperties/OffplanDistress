"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { claimLink } from "@/app/actions/admin";
import { PHONE_BUTTON } from "@/components/admin/phone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

/**
 * "Send claim link" on a staff-created listing (src/lib/claim.ts): by email when the seller has a real address and
 * email is set up, or copied for WhatsApp, with a chat to the seller's number that already holds the message (the
 * dialog says which number: the one on the seller's account). Every new link cancels the previous one.
 */
export function ClaimLinkButtons({ listingId, sellerName, canEmail }: { listingId: string; sellerName: string; canEmail: boolean }) {
  const t = useT("admin");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url: string; whatsapp: string | null; phone: string | null } | null>(null);
  const copyButton = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {canEmail && (
        <Button
          size="sm"
          variant="outline"
          className={PHONE_BUTTON}
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
        ref={copyButton}
        size="sm"
        className={PHONE_BUTTON}
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
            const whatsapp = ("whatsapp" in res && res.whatsapp) || null;
            setLink({ url, whatsapp, phone: ("phone" in res && res.phone) || null });
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
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            copyButton.current?.focus();
          }}
        >
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
              // 16 px below md: iOS zooms into a smaller field when it is tapped.
              className="font-mono text-base md:text-xs"
            />
          </div>
          {link?.whatsapp && (
            <div className="space-y-1.5">
              {/* Its label wraps on a phone: on one line it was wider than a 320 px screen, and the dialog with it. */}
              <Button asChild className="w-full sm:w-auto max-lg:h-11 max-sm:h-auto max-sm:min-h-11 max-sm:whitespace-normal max-sm:py-2">
                <a href={link.whatsapp} target="_blank" rel="noopener noreferrer" data-testid="claim-whatsapp">
                  <MessageCircle aria-hidden /> {t("claim.openWhatsApp")}
                </a>
              </Button>
              {/* Check it is the seller's: an account's own number, never verified, may be old (or not theirs). */}
              {link.phone && (
                <p className="text-xs text-muted-foreground" data-testid="claim-whatsapp-to">
                  {t("claim.whatsappTo", { phone: link.phone })}
                </p>
              )}
            </div>
          )}
          {/* Below lg a Close button too (a phone has no Escape key, and the corner X is small). */}
          <DialogFooter className="lg:hidden">
            <DialogClose asChild>
              <Button variant="outline" className="h-11">
                {tc("close")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
