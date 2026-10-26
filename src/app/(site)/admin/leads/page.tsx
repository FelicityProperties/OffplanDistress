import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { LeadNotes, LeadStatusSelect } from "@/components/admin/LeadControls";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { AedRange } from "@/components/exit/Aed";
import { Button } from "@/components/ui/button";
import { richText } from "@/content/legal/rich-text";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { leadCode, sellerEstimate } from "@/lib/estimate";
import { formatAED, formatPct, formatQuarter, refCode, timeAgo } from "@/lib/format";
import { adminLeads, whatsappNumber } from "@/lib/leads";
import { developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

const STATUS_TONE = { new: "gold", contacted: "muted", converted: "success", lost: "muted" } as const;

export default async function LeadsPage() {
  await requireAdmin();
  const [rows, t, tc, locale] = await Promise.all([adminLeads(), getT("admin"), getT("common"), getLocale()]);
  return (
    <div className="space-y-6">
      <PageTitle title={t("leads.title")} sub={t("leads.sub")} />
      {rows.length === 0 ? (
        <EmptyState title={t("leads.empty")} />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {rows.map(({ lead: l, urgent, userName, listingRef }) => {
            const ref = leadCode(l.refNo);
            const est = sellerEstimate(l.spaPrice, l.amountPaid, l.marketPrice);
            const wa = whatsappNumber(l.phone);
            const src = l.source;
            const sourceBits = [
              [src?.utm_source, src?.utm_medium, src?.utm_campaign].filter(Boolean).join(" / "),
              src?.ref ? t("leads.source.ref", { ref: src.ref }) : "",
              src?.referrer_host ? t("leads.source.from", { host: src.referrer_host }) : "",
              src?.landing ? t("leads.source.landing", { path: src.landing }) : "",
            ].filter(Boolean);
            return (
              <div
                key={l.id}
                id={`lead-${l.refNo}`}
                className={cn("grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]", (l.status === "lost" || l.status === "converted") && "opacity-70")}
              >
                {/* wrap-anywhere: names, typed developers, projects and campaign tags can be one long word (phones). */}
                <div className="min-w-0 space-y-1.5 wrap-anywhere">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{l.name}</p>
                    <bdi className="text-xs font-medium text-muted-foreground tabular">{ref}</bdi>
                    <StatusPill tone={STATUS_TONE[l.status]}>{t(`leads.status.${l.status}`)}</StatusPill>
                    {urgent && <StatusPill tone="destructive">{t("leads.urgent")}</StatusPill>}
                    {l.defaultNotice && <StatusPill tone="warning">{t("leads.notice")}</StatusPill>}
                    {l.missed !== "none" && <StatusPill tone="warning">{t(`leads.missed.${l.missed}`)}</StatusPill>}
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(l.createdAt, locale)} · {t(l.locale === "ar" ? "leads.locale.ar" : "leads.locale.en")}
                    </span>
                  </div>
                  <p className="text-sm">
                    <bdi>{developerName(tc, l.developer)}</bdi>
                    {l.project && (
                      <>
                        {" · "}
                        <bdi>{l.project}</bdi>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("leads.numbers", {
                      price: formatAED(l.spaPrice, locale),
                      paid: formatAED(l.amountPaid, locale),
                      pct: formatPct(est.paidPct),
                      handover: formatQuarter(l.handoverQuarter, locale),
                    })}
                  </p>
                  {l.marketPrice != null && (
                    <p className="text-sm text-muted-foreground">{t("leads.market", { amount: formatAED(l.marketPrice, locale) })}</p>
                  )}
                  <p className="text-sm font-medium">
                    {richText(t("leads.estimate"), { range: <AedRange low={est.low} high={est.high} locale={locale} /> })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{t("leads.source")}:</span>{" "}
                    {sourceBits.length ? sourceBits.map((b, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <bdi>{b}</bdi>
                      </span>
                    )) : t("leads.source.direct")}
                  </p>
                  {(l.userId || l.listingId) && (
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {l.userId && (
                        <Link href={`/admin/users#user-${l.userId}`} className="font-medium underline-offset-4 hover:underline">
                          {t("leads.account")}: {userName ?? "—"}
                        </Link>
                      )}
                      {l.listingId && listingRef != null && (
                        <Link href={`/admin/listings/${l.listingId}`} className="font-medium underline-offset-4 hover:underline">
                          {t("leads.listing", { ref: refCode(listingRef) })}
                        </Link>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>
                        <Phone aria-hidden /> {t("leads.call")} <bdi dir="ltr">{l.phone}</bdi>
                      </a>
                    </Button>
                    {wa && (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={`https://wa.me/${wa}?text=${encodeURIComponent(t("leads.wa.text", { name: l.name, brand: BRAND.name, ref }))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle aria-hidden /> {t("leads.whatsapp")}
                        </a>
                      </Button>
                    )}
                    {l.email && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`mailto:${l.email}`}>
                          <bdi dir="ltr">{l.email}</bdi>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <LeadStatusSelect id={l.id} value={l.status} />
                  <LeadNotes id={l.id} notes={l.notes} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
