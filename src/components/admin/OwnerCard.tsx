"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { adminConfirmFormA, adminSetListingOwner } from "@/app/actions/admin";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";

/**
 * The Owner card of a listing our team entered, until ownership is confirmed (adminSetListingOwner): who it is filed
 * under — an imported unit starts under its network's placeholder. The same fields and matching rules as the intake
 * form's seller. Submitted without the browser's own validation, so every message comes from the server.
 */
export function OwnerForm({ listingId, placeholder }: { listingId: string; placeholder: boolean }) {
  const ti = useT("intake");
  const t = useT("admin");
  const [state, action] = useActionState(adminSetListingOwner, {});
  const [pending, start] = useTransition();
  const fe = state.fieldErrors ?? {};
  const invalid = (k: string) => (fe[k] ? true : undefined);

  useEffect(() => {
    if (state.ok) toast.success(ti("owner.saved"));
    // Only on a new result — not when the language (and so `ti`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      noValidate
      className="space-y-4"
      data-testid="owner-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      <input type="hidden" name="listingId" value={listingId} />
      <p className="text-sm text-muted-foreground">{ti(placeholder ? "owner.pendingHint" : "owner.changeHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={ti("owner.name")} htmlFor="ownerName" error={fe.sellerName} className="sm:col-span-2">
          <Input id="ownerName" name="sellerName" dir="auto" maxLength={120} autoComplete="off" aria-invalid={invalid("sellerName")} />
        </Field>
        <Field label={ti("owner.phone")} htmlFor="ownerPhone" error={fe.sellerPhone} hint={ti("owner.phoneHint")}>
          <Input id="ownerPhone" name="sellerPhone" type="tel" dir="ltr" maxLength={30} autoComplete="off" aria-invalid={invalid("sellerPhone")} />
        </Field>
        <Field label={ti("owner.email")} htmlFor="ownerEmail" error={fe.sellerEmail}>
          <Input id="ownerEmail" name="sellerEmail" type="email" dir="ltr" maxLength={200} autoComplete="off" aria-invalid={invalid("sellerEmail")} />
        </Field>
        <Field label={ti("owner.locale")} htmlFor="ownerLocale">
          <select id="ownerLocale" name="sellerLocale" defaultValue="en" className={selectClass}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {t(`create.locale.${l}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? ti("owner.saving") : ti(placeholder ? "owner.submitSet" : "owner.submitChange")}
        </Button>
        {/* A field's own message says it; the banner only for the rest. */}
        {!Object.keys(fe).length && <FormMessage state={state} />}
      </div>
    </form>
  );
}

/**
 * "The owner's signed Form A is uploaded and checked": confirms ownership of a listing our team entered without the
 * claim link (adminConfirmFormA), once a form_a document is on file and the listing has its real owner.
 */
export function FormAConfirm({ listingId, fileName }: { listingId: string; fileName: string | null }) {
  const ti = useT("intake");
  const [state, action] = useActionState(adminConfirmFormA, {});
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state.ok) toast.success(ti("formA.confirmed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-2 border-t pt-4" data-testid="form-a">
      <h3 className="font-sans text-sm font-semibold">{ti("formA.title")}</h3>
      <p className="text-sm text-muted-foreground">{ti("formA.hint")}</p>
      {fileName ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(() => action(fd));
          }}
        >
          <input type="hidden" name="listingId" value={listingId} />
          <p className="text-xs text-muted-foreground wrap-anywhere">{ti("formA.onFile", { name: fileName })}</p>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox id="formAChecked" name="formAChecked" className="mt-0.5" /> <span>{ti("formA.check")}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? ti("formA.confirming") : ti("formA.submit")}
            </Button>
            <FormMessage state={state} />
          </div>
        </form>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">{ti("formA.needDoc")}</p>
      )}
    </div>
  );
}
