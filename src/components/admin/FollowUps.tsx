import Link from "next/link";
import { ListTodo, Mail, MessageCircle, Phone } from "lucide-react";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { formatAED, formatDate, formatNumber, timeAgo } from "@/lib/format";
import { whatsappNumber } from "@/lib/leads";
import { FOLLOW_UP_KEYS, followUpCounts, followUps, type FollowUpItem, type FollowUpKey } from "@/lib/reminders";

// "Follow-ups" on /admin: every rule of src/lib/reminders.ts with its open items, from the same queries as the admins'
// daily digest, so the numbers here and in the digest agree. Each item links to where it is handled and has call /
// WhatsApp buttons for the person to chase (contact details are for our team only).

/** Items shown per rule; the next ones open in place under "+N more", the rest are on the rule's own page. */
const SHOWN = 6;
const EXPANDED = 60;

/** Where every item of a rule can be found, past EXPANDED. */
const MORE_HREF: Record<FollowUpKey, string> = {
  offers: "/admin/offers",
  counters: "/admin/offers",
  viewings: "/admin/inquiries",
  instalments: "/admin/pipeline",
  review: "/admin",
  docs: "/admin",
  leads: "/admin/leads",
  signup: "/admin/users",
  noOffers: "/admin/pipeline",
};

export async function FollowUps() {
  const [f, t, tl, locale] = await Promise.all([followUps(), getT("admin"), getT("legal"), getLocale()]);
  const { counts, total } = followUpCounts(f);
  // Numbers, amounts and dates keep their own direction inside Arabic sentences.
  const iso = (s: string) => (locale === "ar" ? `⁨${s}⁩` : s);
  const sep = locale === "ar" ? "، " : ", ";

  const meta = (key: FollowUpKey, it: FollowUpItem) => {
    const time = timeAgo(it.since, locale);
    switch (key) {
      case "signup":
        return t("followups.signup.meta", { time });
      case "docs":
        return t("followups.docs.meta", { time, missing: (it.missing ?? []).map((m) => t(`followups.missing.${m}`)).join(sep) });
      case "noOffers":
        return t("followups.noOffers.meta", { date: iso(formatDate(it.date, locale)), views: formatNumber(it.views ?? 0) });
      case "offers":
        return t("followups.offers.meta", { amount: iso(formatAED(it.amount, locale)), time });
      case "counters":
        return t("followups.counters.meta", { amount: iso(formatAED(it.amount, locale)), time });
      case "leads":
        return t("followups.leads.meta", { time });
      case "review":
        return t("followups.review.meta", { time });
      case "instalments":
        return it.amount
          ? t("followups.instalments.meta", { amount: iso(formatAED(it.amount, locale)), date: iso(formatDate(it.date, locale)) })
          : t("followups.instalments.metaNoAmount", { date: iso(formatDate(it.date, locale)) });
      case "viewings":
        return t("followups.viewings.meta", { time });
    }
  };

  /** The WhatsApp message our team starts with, in the admin's language. */
  const waText = (key: FollowUpKey, it: FollowUpItem) => {
    const vars = { name: it.contact.name, brand: BRAND.name, ref: it.ref ?? "", project: it.project ?? it.title };
    if (key === "signup") return t("followups.wa.account", vars);
    if (key === "leads") return t("leads.wa.text", vars);
    if (key === "offers" || key === "counters") return t("followups.wa.offer", vars);
    if (key === "viewings") return it.ref ? t("followups.wa.viewing", vars) : t("followups.wa.account", vars);
    return t("followups.wa.listing", vars);
  };

  const item = (key: FollowUpKey, it: FollowUpItem) => {
    const wa = it.contact.phone ? whatsappNumber(it.contact.phone) : null;
    return (
      <li key={it.id} className="space-y-1.5 px-4 py-3 wrap-anywhere" data-followup-id={it.id}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={it.href} className="font-medium underline-offset-4 hover:underline">
            <bdi>{it.title}</bdi>
          </Link>
          {it.ref && <bdi className="text-xs font-medium text-muted-foreground tabular">{it.ref}</bdi>}
          {it.escalated && <StatusPill tone="destructive">{t("followups.escalated")}</StatusPill>}
          {it.overdue && <StatusPill tone="destructive">{t("followups.overdue")}</StatusPill>}
          {it.awaitingSeller && <StatusPill tone="warning">{t("claim.pendingBadge")}</StatusPill>}
        </div>
        <p className="text-xs text-muted-foreground">{meta(key, it)}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {key !== "signup" && key !== "leads" && (
            <span className="text-xs font-medium">
              <bdi>{it.contact.name}</bdi>
            </span>
          )}
          {it.contact.phone ? (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${it.contact.phone.replace(/[^\d+]/g, "")}`}>
                <Phone aria-hidden /> {t("leads.call")} <bdi dir="ltr">{it.contact.phone}</bdi>
              </a>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t("followups.noPhone")}</span>
          )}
          {wa && (
            <Button asChild size="sm" variant="outline">
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(waText(key, it))}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("followups.waLabel", { name: it.contact.name })} ${tl("newTab")}`}
              >
                <MessageCircle aria-hidden /> {t("leads.whatsapp")}
              </a>
            </Button>
          )}
          {!it.contact.phone && it.contact.email && (
            <Button asChild size="sm" variant="ghost">
              <a href={`mailto:${it.contact.email}`}>
                <Mail aria-hidden /> <bdi dir="ltr">{it.contact.email}</bdi>
              </a>
            </Button>
          )}
        </div>
      </li>
    );
  };

  const groups = FOLLOW_UP_KEYS.filter((k) => counts[k] > 0);

  return (
    <section id="follow-ups" aria-labelledby="follow-ups-title" className="scroll-mt-24 space-y-4" data-testid="follow-ups">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
          <ListTodo className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="follow-ups-title" className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            {t("followups.title")}
            {total > 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-gold-foreground tabular">{formatNumber(total)}</span>
            )}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("followups.sub")}</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-5 py-6 text-center text-sm text-muted-foreground">{t("followups.empty")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {groups.map((key) => {
            const items = f[key];
            const rest = items.slice(SHOWN, EXPANDED);
            return (
              <section
                key={key}
                aria-labelledby={`fu-${key}-title`}
                data-followup={key}
                className="min-w-0 rounded-xl border bg-card shadow-card"
              >
                <header className="border-b px-4 py-3">
                  <h3 id={`fu-${key}-title`} className="flex items-center justify-between gap-3 font-sans text-sm font-semibold">
                    <span className="min-w-0">{t(`followups.${key}.title`)}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular" data-testid="followup-count">
                      {formatNumber(items.length)}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t(`followups.${key}.hint`)}</p>
                </header>
                <ul className="divide-y">{items.slice(0, SHOWN).map((it) => item(key, it))}</ul>
                {rest.length > 0 && (
                  // The next ones open in place; past EXPANDED the rule's own page lists them all.
                  <details className="group border-t">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-open:no-underline">
                      {t("followups.more", { n: items.length - SHOWN })}
                    </summary>
                    <ul className="divide-y border-t">{rest.map((it) => item(key, it))}</ul>
                    {items.length > EXPANDED && (
                      <p className="border-t px-4 py-2.5 text-sm">
                        <Link href={MORE_HREF[key]} className="font-medium underline underline-offset-4 hover:no-underline">
                          {t("followups.more", { n: items.length - EXPANDED })}
                        </Link>
                      </p>
                    )}
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
