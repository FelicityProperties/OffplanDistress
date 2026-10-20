import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { adminStats } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const s = await adminStats();
  return (
    <AppShell
      title="Operations"
      items={[
        { href: "/admin", label: "Verification queue", icon: "queue", count: s.pending, exact: true },
        { href: "/admin/pipeline", label: "Deals pipeline", icon: "listings" },
        { href: "/admin/offers", label: "Offers", icon: "offers", count: s.pendingOffers },
        { href: "/admin/inquiries", label: "Inquiries", icon: "inquiries", count: s.openInquiries },
        { href: "/admin/users", label: "Users", icon: "users" },
      ]}
    >
      {children}
    </AppShell>
  );
}
