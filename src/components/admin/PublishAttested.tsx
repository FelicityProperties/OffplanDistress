"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { adminPublishAttested, type PublishSkipped } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/client";

/**
 * "Publish all N on Felicity's permits" on the Imported tab of /admin: the account owner's attestation (BULK_ATTESTATION
 * in src/lib/attestation.ts) for every unit of one import still in review under its placeholder owner, then
 * adminPublishAttested. `named`: units of several imports are waiting, so the button says which one it publishes.
 */
export function PublishAttestedButton({ sourceKey, sourceName, count, named }: { sourceKey: string; sourceName: string; count: number; named: boolean }) {
  const ti = useT("intake");
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  if (count < 1) return null;
  const skippedLines = (s: PublishSkipped) =>
    (["hasPermit", "formAExpired", "changed"] as const).filter((k) => s[k] > 0).map((k) => ti(`publish.skipped.${k}`, { n: s[k] }));
  return (
    <>
      <Button
        ref={trigger}
        size="sm"
        data-testid="publish-attested"
        onClick={() => {
          // The statement is ticked afresh each time the dialog opens.
          setChecked(false);
          setOpen(true);
        }}
      >
        <Megaphone aria-hidden /> {named ? ti("publish.buttonSource", { n: count, source: sourceName }) : ti("publish.button", { n: count })}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        {/* Opened from a button outside it (not a DialogTrigger): closed, focus goes back to that button. */}
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{count === 1 ? ti("publish.titleOne") : ti("publish.title", { n: count })}</DialogTitle>
            <DialogDescription>{ti("publish.desc", { n: count, source: sourceName })}</DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-lg border border-gold/40 bg-gold-soft p-3 text-sm text-gold-foreground">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" data-testid="attest-check" />
            <span className="font-medium">{ti("publish.statement")}</span>
          </label>
          <DialogFooter>
            <Button
              disabled={!checked || pending}
              data-testid="attest-submit"
              onClick={() =>
                start(async () => {
                  const res = await adminPublishAttested(sourceKey).catch(() => ({ error: ti("publish.failed") }));
                  if ("error" in res) {
                    toast.error(res.error);
                    return;
                  }
                  setOpen(false);
                  const lines = skippedLines(res.skipped);
                  if (res.published === 0) toast(lines.length ? lines.join(" ") : ti("publish.none"));
                  else toast.success(res.published === 1 ? ti("publish.doneOne") : ti("publish.done", { n: res.published }), { description: lines.join(" ") || undefined });
                })
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {pending ? ti("publish.publishing") : ti("publish.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
