import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminStats } from "@/lib/admin";
import { leadStats } from "@/lib/leads";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("admin");
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [s, leads, t] = await Promise.all([adminStats(), leadStats(), getT("admin")]);
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
      ]}
    >
      {children}
    </AppShell>
  );
}
