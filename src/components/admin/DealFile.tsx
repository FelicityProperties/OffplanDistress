"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDealNote, updateDealFile } from "@/app/actions/admin";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { FEES } from "@/lib/config";
import { analyzeDeal, platformFee } from "@/lib/deal-math";
import { formatAED } from "@/lib/format";

// The deal file card's form on the admin listing page (src/lib/deals.ts saveDealFile through updateDealFile). Every
// field is optional: our team fills it in as the deal moves on, and the stage gates in the listing editor say what a
// step still needs.

const HOLDERS = ["broker", "seller", "trustee", "developer", "other"] as const;

export type DealFileValues = {
  agreedPrice: number | null;
  depositAmount: number | null;
  depositHeldBy: string | null;
  formANo: string | null;
  formASignedAt: string | null;
  formAExpiresAt: string | null;
  formBNo: string | null;
  formBSignedAt: string | null;
  formFNo: string | null;
  formFSignedAt: string | null;
  cobrokerCompany: string | null;
  cobrokerOrn: string | null;
  cobrokerBrn: string | null;
  cobrokerFormINo: string | null;
  cobrokerSplitPct: number | null;
  nocAppliedAt: string | null;
  nocFee: number | null;
  nocIssuedAt: string | null;
  nocValidUntil: string | null;
  trusteeOffice: string | null;
  transferBookedFor: string | null;
  transferredAt: string | null;
  invoiceNo: string | null;
  commissionPaidAt: string | null;
};

type Props = {
  dealId: string;
  listingId: string;
  /** deals.updated_at as loaded: saving after someone else saved is refused (deal.changed). */
  updatedWas: string;
  values: DealFileValues;
  /** The balance still owed to the developer (original price − amount paid), added to the agreed price. */
  remaining: number;
  /**
   * The unit's figures behind the buyer's cash on transfer day at the agreed price (analyzeDeal's cashToClose: the
   * agreed price, our fee + VAT, the DLD fee, the registration and NOC estimates, and the arrears with the developer).
   */
  deal: { originalPrice: number; amountPaid: number; overdueAmount: number | null; overduePenalty: number | null };
  /** No buyer linked: the form offers to link one by email. */
  needsBuyer: boolean;
  /** Today in Dubai, the latest date for anything that has already happened. */
  today: string;
};

const pct = (rate: number) => `${Math.round(rate * 10_000) / 100}%`;

export function DealFileForm(p: Props) {
  const t = useT("admin");
  const tc = useT("common");
  const locale = useLocale();
  const [state, action] = useActionState(updateDealFile, {});
  // Submitted from onSubmit (not the form's action), as the staff listing form: a form action resets every field
  // after it runs, so one refused date would put back the old values of everything else the admin had typed.
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state.ok) toast.success(t("dealFile.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};
  const v = p.values;
  // The sale value and our fee follow the agreed price as it is typed.
  const [agreed, setAgreed] = useState(v.agreedPrice == null ? "" : String(v.agreedPrice));
  const [split, setSplit] = useState(v.cobrokerSplitPct == null ? "" : String(v.cobrokerSplitPct));
  const agreedNum = /^\d+$/.test(agreed.trim()) ? Number(agreed.trim()) : null;
  const saleValue = agreedNum == null ? null : agreedNum + p.remaining;
  const fee = saleValue == null ? null : platformFee(saleValue);
  // What the buyer brings on transfer day at this price: the deal page's "cash at transfer", at the agreed price
  // rather than the asking price (an estimate, like everything built on FEES).
  const cashAtTransfer =
    agreedNum == null ? null : analyzeDeal({ ...p.deal, askingPrice: agreedNum, launchPrice: null }).cashToClose;
  const splitNum = /^\d+$/.test(split.trim()) ? Math.min(Number(split.trim()), 100) : 0;
  // A field's error (or hint) line, named by its control so a screen reader reads it with the field.
  const msgId = (name: string) => `deal-${name}-msg`;
  const describedBy = (name: string, hint?: string) => (fe[name] || hint ? msgId(name) : undefined);

  const text = (name: keyof DealFileValues, label: string, opts: { hint?: string; max?: number; ltr?: boolean } = {}) => (
    <Field label={label} htmlFor={`deal-${name}`} error={fe[name]} hint={opts.hint} messageId={msgId(name)}>
      <Input
        id={`deal-${name}`}
        name={name}
        dir={opts.ltr ? "ltr" : "auto"}
        maxLength={opts.max ?? 60}
        aria-invalid={fe[name] ? true : undefined}
        aria-describedby={describedBy(name, opts.hint)}
        defaultValue={(v[name] as string | null) ?? ""}
      />
    </Field>
  );
  const date = (name: keyof DealFileValues, label: string, opts: { hint?: string; past?: boolean } = {}) => (
    <Field label={label} htmlFor={`deal-${name}`} error={fe[name]} hint={opts.hint} messageId={msgId(name)}>
      <Input
        id={`deal-${name}`}
        name={name}
        type="date"
        max={opts.past ? p.today : undefined}
        aria-invalid={fe[name] ? true : undefined}
        aria-describedby={describedBy(name, opts.hint)}
        defaultValue={(v[name] as string | null) ?? ""}
      />
    </Field>
  );
  const money = (name: keyof DealFileValues, label: string, hint?: string) => (
    <Field label={label} htmlFor={`deal-${name}`} error={fe[name]} hint={hint} messageId={msgId(name)}>
      <Input
        id={`deal-${name}`}
        name={name}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        aria-invalid={fe[name] ? true : undefined}
        aria-describedby={describedBy(name, hint)}
        defaultValue={(v[name] as number | null) ?? ""}
      />
    </Field>
  );
  const fieldset = "grid gap-4 rounded-xl border border-border/80 p-4 sm:grid-cols-2 lg:grid-cols-3";
  const legend = "px-1 text-sm font-semibold";

  return (
    // noValidate: the server checks every field and answers in the page's language, next to the field.
    <form
      noValidate
      className="space-y-4"
      aria-label={t("dealFile.title")}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      <input type="hidden" name="dealId" value={p.dealId} />
      <input type="hidden" name="listingId" value={p.listingId} />
      <input type="hidden" name="updatedWas" value={p.updatedWas} />

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.price")}</legend>
        <Field label={t("dealFile.field.agreedPrice")} htmlFor="deal-agreedPrice" error={fe.agreedPrice} hint={t("dealFile.field.agreedPriceHint")} messageId={msgId("agreedPrice")}>
          <Input
            id="deal-agreedPrice"
            name="agreedPrice"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-invalid={fe.agreedPrice ? true : undefined}
            aria-describedby={`${msgId("agreedPrice")} deal-sale-value`}
            value={agreed}
            onChange={(e) => setAgreed(e.target.value)}
          />
        </Field>
        {money("depositAmount", t("dealFile.field.depositAmount"))}
        <Field label={t("dealFile.field.depositHeldBy")} htmlFor="deal-depositHeldBy" error={fe.depositHeldBy} messageId={msgId("depositHeldBy")}>
          <select
            id="deal-depositHeldBy"
            name="depositHeldBy"
            defaultValue={v.depositHeldBy ?? ""}
            className={selectClass}
            aria-invalid={fe.depositHeldBy ? true : undefined}
            aria-describedby={describedBy("depositHeldBy")}
          >
            <option value="">{t("dealFile.held.none")}</option>
            {HOLDERS.map((h) => (
              <option key={h} value={h}>
                {t(`dealFile.held.${h}`)}
              </option>
            ))}
          </select>
        </Field>
        <div id="deal-sale-value" aria-live="polite" className="space-y-1 rounded-lg bg-secondary px-3 py-2 text-sm sm:col-span-2 lg:col-span-3">
          {saleValue != null && fee ? (
            <>
              <p className="tabular">
                {t("dealFile.saleValue", { amount: formatAED(saleValue, locale), remaining: formatAED(p.remaining, locale) })}
              </p>
              <p className="tabular text-muted-foreground">
                {t("dealFile.fee", { rate: pct(FEES.commissionRate), amount: formatAED(fee.total, locale) })}
                {splitNum > 0 && (
                  <>
                    {" · "}
                    {t("dealFile.feeShare", { pct: splitNum, amount: formatAED(Math.round((fee.total * (100 - splitNum)) / 100), locale) })}
                  </>
                )}
              </p>
              {cashAtTransfer != null && (
                <p className="tabular text-muted-foreground" data-testid="deal-cash-at-transfer">
                  {t("dealFile.cashAtTransfer", { amount: tc("approx", { amount: formatAED(cashAtTransfer, locale) }) })}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t("dealFile.field.agreedPriceHint")}</p>
          )}
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.forms")}</legend>
        {text("formANo", t("dealFile.field.formANo"), { ltr: true })}
        {date("formASignedAt", t("dealFile.field.formASignedAt"), { past: true })}
        {date("formAExpiresAt", t("dealFile.field.formAExpiresAt"), { hint: t("dealFile.field.formAHint") })}
        {text("formBNo", t("dealFile.field.formBNo"), { ltr: true })}
        {date("formBSignedAt", t("dealFile.field.formBSignedAt"), { past: true, hint: t("dealFile.field.formBHint") })}
        <div className="hidden lg:block" aria-hidden />
        {text("formFNo", t("dealFile.field.formFNo"), { ltr: true })}
        {date("formFSignedAt", t("dealFile.field.formFSignedAt"), { past: true, hint: t("dealFile.field.formFHint") })}
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.cobroker")}</legend>
        {text("cobrokerCompany", t("dealFile.field.cobrokerCompany"), { max: 120 })}
        {text("cobrokerOrn", t("dealFile.field.cobrokerOrn"), { max: 30, ltr: true })}
        {text("cobrokerBrn", t("dealFile.field.cobrokerBrn"), { max: 30, ltr: true })}
        {text("cobrokerFormINo", t("dealFile.field.cobrokerFormINo"), { ltr: true })}
        <Field label={t("dealFile.field.cobrokerSplitPct")} htmlFor="deal-cobrokerSplitPct" error={fe.cobrokerSplitPct} messageId={msgId("cobrokerSplitPct")}>
          <Input
            id="deal-cobrokerSplitPct"
            name="cobrokerSplitPct"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            aria-invalid={fe.cobrokerSplitPct ? true : undefined}
            aria-describedby={describedBy("cobrokerSplitPct")}
            value={split}
            onChange={(e) => setSplit(e.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.noc")}</legend>
        {date("nocAppliedAt", t("dealFile.field.nocAppliedAt"), { past: true })}
        {money("nocFee", t("dealFile.field.nocFee"), t("dealFile.field.nocFeeHint"))}
        <div className="hidden lg:block" aria-hidden />
        {date("nocIssuedAt", t("dealFile.field.nocIssuedAt"), { past: true })}
        {date("nocValidUntil", t("dealFile.field.nocValidUntil"))}
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.transfer")}</legend>
        {text("trusteeOffice", t("dealFile.field.trusteeOffice"), { max: 120 })}
        {date("transferBookedFor", t("dealFile.field.transferBookedFor"))}
        {date("transferredAt", t("dealFile.field.transferredAt"), { past: true })}
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>{t("dealFile.section.commission")}</legend>
        {text("invoiceNo", t("dealFile.field.invoiceNo"), { ltr: true })}
        {date("commissionPaidAt", t("dealFile.field.commissionPaidAt"), { past: true })}
      </fieldset>

      {p.needsBuyer && (
        <fieldset className={fieldset}>
          <legend className={legend}>{t("dealFile.section.buyer")}</legend>
          <Field
            label={t("dealFile.field.buyerEmail")}
            htmlFor="deal-buyerEmail"
            error={fe.buyerEmail}
            hint={t("dealFile.field.buyerEmailHint")}
            messageId={msgId("buyerEmail")}
            className="sm:col-span-2"
          >
            <Input
              id="deal-buyerEmail"
              name="buyerEmail"
              type="email"
              dir="ltr"
              maxLength={200}
              autoComplete="off"
              aria-invalid={fe.buyerEmail ? true : undefined}
              aria-describedby={msgId("buyerEmail")}
            />
          </Field>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? tc("saving") : t("dealFile.save")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Adds a note to the deal file. */
export function DealNoteForm({ dealId }: { dealId: string }) {
  const t = useT("admin");
  const tc = useT("common");
  const [state, action] = useActionState(addDealNote, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.success(t("dealFile.notes.added"));
      ref.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={action} noValidate className="space-y-2">
      <input type="hidden" name="dealId" value={dealId} />
      <Field label={t("dealFile.notes.label")} htmlFor="deal-note" error={state.fieldErrors?.body} messageId="deal-note-msg">
        <Textarea
          id="deal-note"
          name="body"
          rows={2}
          dir="auto"
          maxLength={2000}
          placeholder={t("dealFile.notes.placeholder")}
          aria-invalid={state.fieldErrors?.body ? true : undefined}
          aria-describedby={state.fieldErrors?.body ? "deal-note-msg" : undefined}
        />
      </Field>
      <SubmitButton size="sm" variant="outline" pendingText={tc("saving")}>
        {t("dealFile.notes.add")}
      </SubmitButton>
    </form>
  );
}
