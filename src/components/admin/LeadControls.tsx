"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveLeadNotes, setLeadStatus } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";

type LeadStatus = "new" | "contacted" | "converted" | "lost";
const STATUSES: LeadStatus[] = ["new", "contacted", "converted", "lost"];

export function LeadStatusSelect({ id, value }: { id: string; value: LeadStatus }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("leads.status.label")}
      defaultValue={value}
      disabled={pending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) =>
        start(async () => {
          const res = await setLeadStatus(id, e.target.value as LeadStatus);
          if (res.error) toast.error(res.error);
          else toast.success(t("leads.status.updated"));
        })
      }
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`leads.status.${s}`)}
        </option>
      ))}
    </select>
  );
}

export function LeadNotes({ id, notes }: { id: string; notes: string | null }) {
  const t = useT("admin");
  const tc = useT("common");
  const [value, setValue] = useState(notes ?? "");
  const [pending, start] = useTransition();
  const changed = value.trim() !== (notes ?? "").trim();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveLeadNotes(id, value);
          if (res.error) toast.error(res.error);
          else toast.success(t("leads.notes.saved"));
        });
      }}
    >
      <Textarea
        aria-label={t("leads.notes")}
        dir="auto"
        rows={2}
        maxLength={3000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("leads.notes.placeholder")}
        className="min-h-0 text-sm"
      />
      {changed && (
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? tc("saving") : t("leads.notes.save")}
        </Button>
      )}
    </form>
  );
}
