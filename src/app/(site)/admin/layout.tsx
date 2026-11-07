import type { Metadata } from "next";
import { ChevronDown, MailWarning } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LocaleGuard } from "@/components/LocaleGuard";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminStats } from "@/lib/admin";
import { emailOffReason } from "@/lib/email";
import { leadStats } from "@/lib/leads";
import { subscriberStats } from "@/lib/newsletter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("admin");
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [s, leads, newsletter, t, ti, tn] = await Promise.all([
    adminStats(),
    leadStats(),
    subscriberStats(),
    getT("admin"),
    getT("intake"),
    getT("newsletter"),
  ]);
  // Without a key, or without a sender on our own domain, no email reaches sellers or buyers (src/lib/email.ts).
  const emailOff = emailOffReason();
  const emailOffDetail = !emailOff
    ? null
    : emailOff.reason === "key" || emailOff.reason === "senderUnset"
      ? t(`emailOff.${emailOff.reason}`)
      : emailOff.reason === "rejected"
        ? t("emailOff.rejected", { value: emailOff.value, status: emailOff.status, error: emailOff.error })
        : t(`emailOff.${emailOff.reason}`, { value: emailOff.value });
  return (
    <AppShell
      title={t("nav.title")}
      items={[
        { href: "/admin", label: t("nav.queue"), icon: "queue", count: s.pending, exact: true },
        { href: "/admin/pipeline", label: t("nav.pipeline"), icon: "listings" },
        { href: "/admin/offers", label: t("nav.offers"), icon: "offers", count: s.pendingOffers },
        { href: "/admin/inquiries", label: t("nav.inquiries"), icon: "inquiries", count: s.openInquiries },
        { href: "/admin/leads", label: t("nav.leads"), icon: "inbox", count: leads.newLeads },
        { href: "/admin/users", label: t("nav.users"), icon: "users" },
        { href: "/admin/analytics", label: t("nav.analytics"), icon: "analytics" },
        // The daily deals newsletter: its confirmed subscribers (src/lib/newsletter.ts).
        { href: "/admin/newsletter", label: tn("admin.nav"), icon: "newsletter", count: newsletter.confirmed },
        // Bulk import of a partner network's file (also linked from the verification queue).
        { href: "/admin/listings/import", label: ti("nav.import"), icon: "upload" },
      ]}
    >
      {emailOff && (
        // Phones (below md): one line on every admin page, the details a tap away (the whole note pushed each page's
        // title a screen down); from md, the note in full.
        <div role="note" data-testid="email-off" className="mb-6 rounded-xl border border-warning/40 bg-warning-soft text-sm">
          <details className="group md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
              <MailWarning className="h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span className="min-w-0 flex-1 font-semibold">{t("emailOff.title")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-4 pb-3 wrap-anywhere text-muted-foreground">{emailOffDetail}</p>
          </details>
          <div className="flex items-start gap-3 px-4 py-3 max-md:hidden">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{t("emailOff.title")}</p>
              <p className="mt-1 wrap-anywhere text-muted-foreground">{emailOffDetail}</p>
            </div>
          </div>
        </div>
      )}
      {/* Reached in-app from a page in the other language: loaded again, whole, in this one. */}
      <LocaleGuard locale={await getLocale()} />
      {children}
    </AppShell>
  );
}
