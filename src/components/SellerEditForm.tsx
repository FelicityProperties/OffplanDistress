"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateMyListing } from "@/app/actions/listings";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
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
  useEffect(() => {
    if (state.ok) toast.success(t("edit.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="listingId" value={p.listingId} />
      <Field label={t("edit.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice}>
        <Input id="askingPrice" name="askingPrice" type="number" min={0} step={1000} defaultValue={p.askingPrice} required />
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
          step={1000}
          defaultValue={p.nextInstalmentAmount ?? ""}
        />
      </Field>
      <Field label={t("edit.description")} htmlFor="description" error={fe.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} defaultValue={p.description ?? ""} dir="auto" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText={tc("saving")}>{t("edit.save")}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
