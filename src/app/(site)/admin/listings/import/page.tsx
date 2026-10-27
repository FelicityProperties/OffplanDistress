import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ImportListings } from "@/components/admin/ImportListings";
import { PageTitle } from "@/components/Kpi";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";

/** Bulk import of a partner network's units (src/lib/import-format.ts): admins only, and nothing is made public. */
export default async function ImportListingsPage() {
  await requireAdmin();
  const [t, ti] = await Promise.all([getT("admin"), getT("intake")]);
  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> {t("nav.queue")}
      </Link>
      <PageTitle title={ti("import.title")} sub={ti("import.sub")} />
      <p role="note" className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">{ti("import.never")}</span>
      </p>
      <ImportListings />
    </div>
  );
}
