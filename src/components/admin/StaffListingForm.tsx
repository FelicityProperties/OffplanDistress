"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminCreateListing } from "@/app/actions/admin";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { COMMUNITIES, DEVELOPERS, MOTIVATION, UNIT_TYPES } from "@/lib/config";
import { formatQuarter } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";

/** Starting values (from a seller lead); every field stays editable. */
export type StaffPrefill = {
  leadId?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerLocale?: "en" | "ar";
  developer?: string;
  developerOther?: string;
  community?: string;
  communityOther?: string;
  projectName?: string;
  originalPrice?: number;
  amountPaid?: number;
  handoverDate?: string;
  motivation?: keyof typeof MOTIVATION;
};

/**
 * Staff-assisted intake (/admin/listings/new): a listing entered from the documents a seller sent. The same listing
 * fields and server rules as the sell form (listingSchema), plus who the seller is. Submitted without the browser's
 * own validation so every message comes from the server in the page's language, and without resetting the form when
 * a field needs fixing.
 */
export function StaffListingForm({ prefill = {}, quarters }: { prefill?: StaffPrefill; quarters: string[] }) {
  const t = useT("admin");
  const tc = useT("common");
  const locale = useLocale();
  const router = useRouter();
  const [state, action] = useActionState(adminCreateListing, {});
  const [pending, start] = useTransition();
  const [developer, setDeveloper] = useState(prefill.developer ?? "");
  const [community, setCommunity] = useState(prefill.community ?? "");
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.listingId) {
      toast.success(t("create.created"));
      router.push(`/admin/listings/${state.listingId}`);
    }
    // Only on a new result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const collator = new Intl.Collator(locale);
  const sorted = (all: string[], name: (v: string) => string) =>
    all.filter((v) => v !== "Other").sort((a, b) => collator.compare(name(a), name(b)));
  const developers = sorted(DEVELOPERS, (v) => developerName(tc, v));
  const communities = sorted(COMMUNITIES, (v) => communityName(tc, v));
  const quarterOptions = prefill.handoverDate && !quarters.includes(prefill.handoverDate) ? [prefill.handoverDate, ...quarters] : quarters;
  const invalid = (k: string) => (fe[k] ? true : undefined);

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      {prefill.leadId && <input type="hidden" name="leadId" value={prefill.leadId} />}
      <input type="hidden" name="paymentPlan" value="[]" />

      <fieldset className="rounded-xl border bg-card p-5 shadow-card">
        <legend className="px-1 font-sans text-lg font-semibold">{t("create.section.seller")}</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field label={t("create.sellerName")} htmlFor="sellerName" error={fe.sellerName} className="sm:col-span-2">
            <Input id="sellerName" name="sellerName" dir="auto" maxLength={120} autoComplete="off" defaultValue={prefill.sellerName} aria-invalid={invalid("sellerName")} />
          </Field>
          <Field label={t("create.sellerPhone")} htmlFor="sellerPhone" error={fe.sellerPhone} hint={t("create.sellerPhoneHint")}>
            <Input id="sellerPhone" name="sellerPhone" type="tel" dir="ltr" maxLength={30} autoComplete="off" defaultValue={prefill.sellerPhone} aria-invalid={invalid("sellerPhone")} />
          </Field>
          <Field label={t("create.sellerEmail")} htmlFor="sellerEmail" error={fe.sellerEmail} hint={t("create.sellerEmailHint")}>
            <Input id="sellerEmail" name="sellerEmail" type="email" dir="ltr" maxLength={200} autoComplete="off" defaultValue={prefill.sellerEmail} aria-invalid={invalid("sellerEmail")} />
          </Field>
          <Field label={t("create.sellerLocale")} htmlFor="sellerLocale">
            <select id="sellerLocale" name="sellerLocale" defaultValue={prefill.sellerLocale ?? "en"} className={selectClass}>
              <option value="en">{t("create.locale.en")}</option>
              <option value="ar">{t("create.locale.ar")}</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border bg-card p-5 shadow-card">
        <legend className="px-1 font-sans text-lg font-semibold">{t("create.section.unit")}</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field label={t("create.projectName")} htmlFor="projectName" error={fe.projectName} className="sm:col-span-2">
            <Input id="projectName" name="projectName" dir="auto" maxLength={120} defaultValue={prefill.projectName} aria-invalid={invalid("projectName")} />
          </Field>
          <Field label={t("create.developer")} htmlFor="developer" error={fe.developer}>
            <select id="developer" name="developer" value={developer} onChange={(e) => setDeveloper(e.target.value)} className={selectClass} aria-invalid={invalid("developer")}>
              <option value="">{t("create.choose")}</option>
              {developers.map((v) => (
                <option key={v} value={v}>
                  {developerName(tc, v)}
                </option>
              ))}
              <option value="Other">{tc("developer.Other")}</option>
            </select>
          </Field>
          {developer === "Other" ? (
            <Field label={t("create.developerOther")} htmlFor="developerOther" error={fe.developerOther}>
              <Input id="developerOther" name="developerOther" dir="auto" maxLength={80} defaultValue={prefill.developerOther} aria-invalid={invalid("developerOther")} />
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Field label={t("create.community")} htmlFor="community" error={fe.community}>
            <select id="community" name="community" value={community} onChange={(e) => setCommunity(e.target.value)} className={selectClass} aria-invalid={invalid("community")}>
              <option value="">{t("create.choose")}</option>
              {communities.map((v) => (
                <option key={v} value={v}>
                  {communityName(tc, v)}
                </option>
              ))}
              <option value="Other">{tc("community.Other")}</option>
            </select>
          </Field>
          {community === "Other" ? (
            <Field label={t("create.communityOther")} htmlFor="communityOther" error={fe.communityOther}>
              <Input id="communityOther" name="communityOther" dir="auto" maxLength={80} defaultValue={prefill.communityOther} aria-invalid={invalid("communityOther")} />
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Field label={t("create.unitType")} htmlFor="unitType" error={fe.unitType}>
            <select id="unitType" name="unitType" defaultValue="" className={selectClass} aria-invalid={invalid("unitType")}>
              <option value="">{t("create.choose")}</option>
              {(Object.keys(UNIT_TYPES) as (keyof typeof UNIT_TYPES)[]).map((k) => (
                <option key={k} value={k}>
                  {tc(`unit.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("create.size")} htmlFor="sizeSqft" error={fe.sizeSqft}>
            <Input id="sizeSqft" name="sizeSqft" type="number" inputMode="numeric" min={1} step={1} dir="ltr" aria-invalid={invalid("sizeSqft")} />
          </Field>
          <Field label={t("create.floor")} htmlFor="floor" error={fe.floor}>
            <Input id="floor" name="floor" dir="auto" maxLength={40} aria-invalid={invalid("floor")} />
          </Field>
          <Field label={t("create.view")} htmlFor="view" error={fe.view}>
            <Input id="view" name="view" dir="auto" maxLength={80} aria-invalid={invalid("view")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border bg-card p-5 shadow-card">
        <legend className="px-1 font-sans text-lg font-semibold">{t("create.section.price")}</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field label={t("create.originalPrice")} htmlFor="originalPrice" error={fe.originalPrice}>
            <Input id="originalPrice" name="originalPrice" type="number" inputMode="numeric" min={0} step={1} dir="ltr" defaultValue={prefill.originalPrice} aria-invalid={invalid("originalPrice")} />
          </Field>
          <Field label={t("create.amountPaid")} htmlFor="amountPaid" error={fe.amountPaid}>
            <Input id="amountPaid" name="amountPaid" type="number" inputMode="numeric" min={0} step={1} dir="ltr" defaultValue={prefill.amountPaid} aria-invalid={invalid("amountPaid")} />
          </Field>
          <Field label={t("create.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice} hint={t("create.askingHint")}>
            <Input id="askingPrice" name="askingPrice" type="number" inputMode="numeric" min={0} step={1} dir="ltr" aria-invalid={invalid("askingPrice")} />
          </Field>
          <Field label={t("create.handover")} htmlFor="handoverDate" error={fe.handoverDate}>
            <select id="handoverDate" name="handoverDate" defaultValue={prefill.handoverDate ?? ""} className={selectClass} aria-invalid={invalid("handoverDate")}>
              <option value="">{t("create.handoverUnknown")}</option>
              {quarterOptions.map((q) => (
                <option key={q} value={q}>
                  {formatQuarter(q, locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("create.nextInstalmentDate")} htmlFor="nextInstalmentDate" error={fe.nextInstalmentDate}>
            <Input id="nextInstalmentDate" name="nextInstalmentDate" type="date" aria-invalid={invalid("nextInstalmentDate")} />
          </Field>
          <Field label={t("create.nextInstalmentAmount")} htmlFor="nextInstalmentAmount" error={fe.nextInstalmentAmount}>
            <Input id="nextInstalmentAmount" name="nextInstalmentAmount" type="number" inputMode="numeric" min={0} step={1} dir="ltr" aria-invalid={invalid("nextInstalmentAmount")} />
          </Field>
          <Field label={t("create.motivation")} htmlFor="motivation" error={fe.motivation}>
            <select id="motivation" name="motivation" defaultValue={prefill.motivation ?? "motivated"} className={selectClass}>
              {(Object.keys(MOTIVATION) as (keyof typeof MOTIVATION)[]).map((m) => (
                <option key={m} value={m}>
                  {tc(`motivation.${m}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("create.description")} htmlFor="description" error={fe.description} hint={t("create.descriptionHint")} className="sm:col-span-2">
            <Textarea id="description" name="description" dir="auto" rows={4} maxLength={3000} aria-invalid={invalid("description")} />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("create.creating") : t("create.submit")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
