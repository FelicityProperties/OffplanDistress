"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateMyListing } from "@/app/actions/listings";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { AedInput } from "@/components/OfferActions";
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
    // grid-cols-1 (minmax(0, 1fr)): an auto column grew with the longest motivation option (380 px in Arabic), past a
    // 320 px phone.
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      <input type="hidden" name="listingId" value={p.listingId} />
      {/* Any whole dirham, as the sell form takes (a step of 1,000 once blocked saving 770,500). Amounts show "820,000"
          with the number pad on a phone; the form still sends 820000. The return key saves the form, so it says "done". */}
      <Field label={t("edit.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice}>
        <AedInput id="askingPrice" name="askingPrice" defaultValue={p.askingPrice} required enterKeyHint="done" />
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
        <AedInput id="nextInstalmentAmount" name="nextInstalmentAmount" defaultValue={p.nextInstalmentAmount} enterKeyHint="done" />
      </Field>
      <Field label={t("edit.description")} htmlFor="description" error={fe.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} maxLength={3000} defaultValue={p.description ?? ""} dir="auto" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 max-sm:flex-col max-sm:items-stretch">
        <Button type="submit" disabled={pending} className="max-lg:h-11">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? tc("saving") : t("edit.save")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
