"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateMyListing } from "@/app/actions/listings";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOTIVATION } from "@/lib/config";

type Props = {
  listingId: string;
  askingPrice: number;
  motivation: keyof typeof MOTIVATION;
  description: string | null;
  nextInstalmentDate: string | null;
  nextInstalmentAmount: number | null;
};

export function SellerEditForm(p: Props) {
  const [state, action] = useActionState(updateMyListing, {});
  useEffect(() => {
    if (state.ok) toast.success("Listing updated");
  }, [state]);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="listingId" value={p.listingId} />
      <Field label="Asking price for your equity (AED)" htmlFor="askingPrice" error={fe.askingPrice}>
        <Input id="askingPrice" name="askingPrice" type="number" min={0} step={1000} defaultValue={p.askingPrice} required />
      </Field>
      <Field label="How quickly do you need to sell?" htmlFor="motivation" error={fe.motivation}>
        <select id="motivation" name="motivation" defaultValue={p.motivation} className={selectClass}>
          {Object.entries(MOTIVATION).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label} — {v.hint}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Next instalment date" htmlFor="nextInstalmentDate" error={fe.nextInstalmentDate}>
        <Input id="nextInstalmentDate" name="nextInstalmentDate" type="date" defaultValue={p.nextInstalmentDate ?? ""} />
      </Field>
      <Field label="Next instalment amount (AED)" htmlFor="nextInstalmentAmount" error={fe.nextInstalmentAmount}>
        <Input
          id="nextInstalmentAmount"
          name="nextInstalmentAmount"
          type="number"
          min={0}
          step={1000}
          defaultValue={p.nextInstalmentAmount ?? ""}
        />
      </Field>
      <Field label="Description" htmlFor="description" error={fe.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} defaultValue={p.description ?? ""} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
