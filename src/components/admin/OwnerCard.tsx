"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { adminConfirmFormA, adminSetListingOwner } from "@/app/actions/admin";
import { PHONE_BUTTON } from "@/components/admin/phone";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";

/**
 * The Owner card of a listing our team entered, until ownership is confirmed and its owner can sign in
 * (adminSetListingOwner): who it is filed under — an imported unit starts under its network's placeholder. The same
 * fields and matching rules as the intake form's seller. Submitted without the browser's own validation, so every
 * message comes from the server. A confirmed listing about to go to an account that can already sign in asks staff to
 * confirm that account by name first (state.confirmAccess), keeping what was typed. The page keeps it mounted when it
 * isn't `open` (renders nothing): filed under an account that can sign in, the card closes with that very save, and
 * still says it saved.
 */
export function OwnerForm({ listingId, placeholder, open = true }: { listingId: string; placeholder: boolean; open?: boolean }) {
  const ti = useT("intake");
  const t = useT("admin");
  const [state, action] = useActionState(adminSetListingOwner, {});
  const [pending, start] = useTransition();
  const fe = state.fieldErrors ?? {};
  const invalid = (k: string) => (fe[k] ? true : undefined);

  useEffect(() => {
    // On a confirmed listing the owner's next step differs: their claim link to sign in, or nothing (they can already).
    const saved =
      state.ownerNext === "claim" ? "owner.savedClaim" : state.ownerNext === "account" ? "owner.savedAccount" : "owner.saved";
    if (state.ok) toast.success(ti(saved));
    // Only on a new result — not when the language (and so `ti`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const access = state.confirmAccess;
  if (!open) return null;

  return (
    <section id="owner" aria-labelledby="owner-title" className="scroll-mt-24 rounded-xl border bg-card p-4 shadow-card sm:p-6">
      <h2 id="owner-title" className="mb-2 font-sans text-lg font-semibold">
        {ti("owner.title")}
      </h2>
      {/* `action` for a submit before the page's scripts have loaded (posted to the server action, never a GET with the
          owner's details in the address); onSubmit once it is interactive, without React's reset of the form. */}
      <form
        action={action}
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
        {/* The account it would go to (by name and address), ticked to file it there: sent back as that account's id, so a
            different email typed meanwhile is asked about again, with a new box (keyed by the account: the tick given for
            the last one isn't kept). A native box: it also works before the scripts load. */}
        {access && (
          <div
            key={access.id}
            role="alert"
            className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm wrap-anywhere"
            data-testid="owner-confirm-access"
          >
            <p>{ti("owner.confirmAccess", { name: access.name, email: access.email })}</p>
            <label htmlFor="ownerConfirmAccess" className="flex cursor-pointer items-start gap-2 font-medium">
              <input
                id="ownerConfirmAccess"
                name="confirmAccount"
                type="checkbox"
                value={access.id}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <span>{ti("owner.confirmAccess.check", { name: access.name })}</span>
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="max-lg:h-11" disabled={pending}>
            {pending ? ti("owner.saving") : ti(placeholder ? "owner.submitSet" : "owner.submitChange")}
          </Button>
          {/* A field's own message says it; the banner only for the rest. */}
          {!Object.keys(fe).length && <FormMessage state={state} />}
        </div>
      </form>
    </section>
  );
}

/**
 * "The owner's signed Form A is uploaded and checked": confirms ownership of a listing our team entered without the
 * claim link (adminConfirmFormA), once a form_a document is on file and the listing has its real owner.
 */
export function FormAConfirm({
  listingId,
  fileName,
  account,
}: {
  listingId: string;
  fileName: string | null;
  /** The account the listing is filed under, when it can already sign in: confirming hands it the listing at once. */
  account?: { id: string; name: string; email: string } | null;
}) {
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
        // `action` for a submit before the scripts have loaded, as the Owner card.
        <form
          action={action}
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
          {account && (
            <div className="space-y-2 rounded-lg border border-gold/40 bg-gold-soft/40 p-3 text-sm" data-testid="form-a-account">
              <p className="wrap-anywhere">{ti("formA.account", { name: account.name, email: account.email })}</p>
              <label className="flex items-start gap-2">
                <Checkbox id="formAAccount" name="confirmAccount" value={account.id} className="mt-0.5" />
                <span>{ti("formA.account.check", { name: account.name })}</span>
              </label>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" className={PHONE_BUTTON} disabled={pending}>
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
