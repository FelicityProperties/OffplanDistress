import { ArrowRight, History } from "lucide-react";
import { intlLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getLocale, getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { HISTORY_LIMIT, listingHistory, type HistoryEvent } from "@/lib/audit";
import { formatAED, formatDate } from "@/lib/format";

// The History panel of the admin listing page (admins only; the page checks): the audit trail of the listing, its deal
// files, offers and documents, newest first (src/lib/audit.ts listingHistory).

const adminKeys = messages.admin.en as Record<string, string>;
const isAdminKey = (k: string): k is TKey<"admin"> => k in adminKeys;

/** Labels the editors already use for these fields; deal-file fields use "dealFile.field.<key>". */
const FIELD_LABELS: Record<string, TKey<"admin">> = {
  status: "form.status",
  verified: "form.verified",
  nocEligible: "form.nocEligible",
  launchPrice: "form.launchPrice",
  askingPrice: "form.askingPrice",
  overdueAmount: "form.overdueAmount",
  overduePenalty: "form.overduePenalty",
  arrearsCheckedAt: "form.arrearsCheckedAt",
  adminNotes: "form.notes",
  dldPermit: "form.dldPermit",
  dldPermitExpiresAt: "form.dldPermitExpiresAt",
  dldPermitUrl: "form.dldPermitUrl",
  formAExpiresAt: "form.formAExpiresAt",
  images: "form.images",
  developer: "form.developer",
  community: "form.community",
  developerOther: "form.developerOther",
  communityOther: "form.communityOther",
  projectName: "create.projectName",
  originalPrice: "create.originalPrice",
  amountPaid: "create.amountPaid",
  kycStatus: "kyc.label",
  role: "role.label",
  note: "dealFile.notes",
  saleValue: "listing.saleValue",
};

const MONEY = new Set([
  "askingPrice",
  "launchPrice",
  "publicPrice",
  "overdueAmount",
  "overduePenalty",
  "originalPrice",
  "amountPaid",
  "amount",
  "counterAmount",
  "nextInstalmentAmount",
  "agreedPrice",
  "saleValue",
  "depositAmount",
  "nocFee",
]);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A moment the diff stored as an ISO string (audit.ts turns Dates into toISOString()), e.g. publishedAt. */
const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
/** One row of a listing's payment plan (src/lib/listing-schema.ts PlanInstalment), as a diff of the plan holds them. */
const isInstalment = (v: unknown): v is { label: string; dueDate: string | null; amount: number } =>
  typeof v === "object" && v !== null && typeof (v as { label?: unknown }).label === "string" && typeof (v as { amount?: unknown }).amount === "number";

export async function HistoryPanel({ listingId }: { listingId: string }) {
  const [events, t, tc, locale] = await Promise.all([listingHistory(listingId), getT("admin"), getT("common"), getLocale()]);
  const when = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" });

  const label = (e: HistoryEvent, key: string) => {
    const deal = `dealFile.field.${key}`;
    if (e.entityType === "deal" && isAdminKey(deal)) return t(deal);
    const known = FIELD_LABELS[key];
    if (known) return t(known);
    const history = `history.field.${key}`;
    if (isAdminKey(history)) return t(history);
    if (isAdminKey(deal)) return t(deal);
    return key;
  };

  const value = (e: HistoryEvent, key: string, v: unknown): string => {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return t(v ? "history.yes" : "history.no");
    if (typeof v === "number") return MONEY.has(key) ? formatAED(v, locale) : String(v);
    if (Array.isArray(v)) return v.map((x) => value(e, key, x)).join(", ") || "—";
    if (isInstalment(v)) return `${v.label}: ${v.dueDate ? formatDate(v.dueDate, locale) : "—"} · ${formatAED(v.amount, locale)}`;
    if (typeof v !== "string") return JSON.stringify(v);
    const lookup = (k: string, ns: "admin" | "common") => {
      if (ns === "admin") return isAdminKey(k) ? t(k) : null;
      return k in messages.common.en ? tc(k as TKey<"common">) : null;
    };
    const translated =
      key === "status"
        ? lookup(`${e.entityType === "offer" ? "offer" : "listing"}.${v}`, "common")
        : key === "kycStatus"
          ? lookup(`kyc.${v}`, "common")
          : key === "kind"
            ? lookup(`file.${v}`, "common")
            : key === "role"
              ? lookup(`role.${v}`, "admin")
              : key === "depositHeldBy"
                ? lookup(`dealFile.held.${v}`, "admin")
                : key === "via"
                  ? lookup(`history.via.${v}`, "admin")
                  : key === "reason"
                    ? lookup(`history.reason.${v}`, "admin")
                    : null;
    if (translated) return translated;
    if (ISO_DAY.test(v)) return formatDate(v, locale);
    // In Dubai time, as the event's own time above.
    if (ISO_MOMENT.test(v)) return when.format(new Date(v));
    return v;
  };

  const actionLabel = (action: string) => {
    const k = `history.action.${action}`;
    return isAdminKey(k) ? t(k) : action;
  };

  return (
    <section aria-labelledby="history-title" className="rounded-xl border bg-card p-6 shadow-card" data-testid="history">
      <h2 id="history-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
        <History className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden /> {t("history.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("history.sub")}</p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <ol className="mt-4 divide-y rounded-lg border">
          {events.map((e) => {
            const diff = e.diff && typeof e.diff === "object" ? Object.entries(e.diff) : [];
            return (
              <li key={e.id} className="px-4 py-3 text-sm" data-action={e.action}>
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0">
                    <span className="font-medium">
                      <bdi>{e.actorName ?? t(e.actorId ? "history.deletedAccount" : "history.system")}</bdi>
                    </span>{" "}
                    · {actionLabel(e.action)}
                    {e.subjectName && (
                      <>
                        {" · "}
                        <bdi>{e.subjectName}</bdi>
                      </>
                    )}
                  </span>
                  <time dateTime={e.createdAt.toISOString()} className="shrink-0 text-xs text-muted-foreground tabular">
                    {when.format(e.createdAt)}
                  </time>
                </p>
                {diff.length > 0 && (
                  <dl className="mt-1.5 space-y-0.5 text-xs">
                    {diff.map(([k, v]) => {
                      const change = Array.isArray(v) && v.length === 2 && e.action !== "samples.delete" && k !== "images";
                      return (
                        <div key={k} className="flex flex-wrap gap-x-1.5 wrap-anywhere">
                          <dt className="text-muted-foreground">{label(e, k)}:</dt>
                          <dd className="min-w-0">
                            {change ? (
                              <>
                                <bdi className="text-muted-foreground line-through decoration-muted-foreground/60">{value(e, k, v[0])}</bdi>
                                <ArrowRight className="mx-1 inline h-3 w-3 rtl:-scale-x-100" aria-label={t("history.changedTo")} />
                                <bdi>{value(e, k, v[1])}</bdi>
                              </>
                            ) : (
                              <bdi className="whitespace-pre-line">{value(e, k, Array.isArray(v) && k === "images" ? (v[1] ?? v) : v)}</bdi>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {e.ip && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("history.ip", { ip: "" })}
                    <bdi dir="ltr">{e.ip}</bdi>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {events.length >= HISTORY_LIMIT && <p className="mt-2 text-xs text-muted-foreground">{t("history.more", { n: HISTORY_LIMIT })}</p>}
    </section>
  );
}
