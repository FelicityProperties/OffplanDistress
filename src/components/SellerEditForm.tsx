"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateMyListing } from "@/app/actions/listings";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { MOTIVATION } from "@/lib/config";

type Motivation = keyof typeof MOTIVATION;

type Props = {
  listingId: string;
  askingPrice: number;
  motivation: Motivation;
  description: string | null;
  nextInstalmentDate: string | null;
  nextInstalmentAmount: number | null;
};

export function SellerEditForm(p: Props) {
  const t = useT("dashboard");
  const tc = useT("common");
  const [state, action] = useActionState(updateMyListing, {});
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state.ok) toast.success(t(state.review ? "edit.savedReview" : "edit.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};

  return (
    // Submitted from onSubmit (not the form's action), so a field that needs fixing doesn't reset what was typed.
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      <input type="hidden" name="listingId" value={p.listingId} />
      <Field label={t("edit.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice}>
        {/* Any whole dirham (step 1), as the sell form takes: a step of 1,000 blocked saving a price like 770,500. */}
        <Input id="askingPrice" name="askingPrice" type="number" min={0} step={1} defaultValue={p.askingPrice} required />
      </Field>
      <Field label={t("edit.motivation")} htmlFor="motivation" error={fe.motivation}>
        <select id="motivation" name="motivation" defaultValue={p.motivation} className={selectClass}>
          {(Object.keys(MOTIVATION) as Motivation[]).map((k) => (
            <option key={k} value={k}>
              {t("edit.motivationOption", { label: tc(`motivation.${k}`), hint: tc(`motivation.${k}.hint`) })}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("edit.nextInstalmentDate")} htmlFor="nextInstalmentDate" error={fe.nextInstalmentDate}>
        <Input id="nextInstalmentDate" name="nextInstalmentDate" type="date" defaultValue={p.nextInstalmentDate ?? ""} />
      </Field>
      <Field label={t("edit.nextInstalmentAmount")} htmlFor="nextInstalmentAmount" error={fe.nextInstalmentAmount}>
        <Input
          id="nextInstalmentAmount"
          name="nextInstalmentAmount"
          type="number"
          min={0}
          step={1}
          defaultValue={p.nextInstalmentAmount ?? ""}
        />
      </Field>
      <Field label={t("edit.description")} htmlFor="description" error={fe.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} maxLength={3000} defaultValue={p.description ?? ""} dir="auto" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? tc("saving") : t("edit.save")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
