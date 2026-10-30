import { isLocale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/claim";
import { toCsv } from "@/lib/csv";
import { isNewsletterSource, subscribersForExport } from "@/lib/newsletter";
import { dubaiToday } from "@/lib/permits";

// GET /api/admin/export/newsletter.csv — every newsletter subscriber with their consent record (when, from which IP,
// where on the site), for our own records and for a mailing tool. Admins only, audited like deals.csv (personal data
// left the system). Headers in the admin's language; a UTF-8 byte order mark so Excel reads Arabic correctly; every
// text cell guarded against formula injection (toCsv).

const dubaiDateTime = (d: Date | null) =>
  d ? new Date(d.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ") : null;

export async function GET() {
  const admin = await requireAdmin();
  const t = await getT("newsletter");
  const rows = await subscribersForExport();
  type Row = (typeof rows)[number];

  const columns: [string, (r: Row) => string | number | null][] = [
    [t("csv.email"), (r) => r.email],
    [t("csv.status"), (r) => t(`admin.status.${r.status}`)],
    [t("csv.language"), (r) => t(`admin.lang.${isLocale(r.locale) ? r.locale : "en"}`)],
    [t("csv.source"), (r) => (isNewsletterSource(r.source) ? t(`admin.source.${r.source}`) : r.source)],
    [t("csv.subscribedAt"), (r) => dubaiDateTime(r.consentedAt)],
    [t("csv.consentIp"), (r) => r.consentIp],
    [t("csv.confirmedAt"), (r) => dubaiDateTime(r.confirmedAt)],
    [t("csv.unsubscribedAt"), (r) => dubaiDateTime(r.unsubscribedAt)],
    [t("csv.lastSentAt"), (r) => dubaiDateTime(r.lastSentAt)],
    // The linked account, never one of our own placeholders (…@claim.offplandistress.invalid).
    [t("csv.account"), (r) => (r.accountEmail && !isPlaceholderEmail(r.accountEmail) ? r.accountEmail : null)],
  ];

  const csv = toCsv([columns.map(([label]) => label), ...rows.map((r) => columns.map(([, get]) => get(r)))]);
  // Personal data left the system: who exported it, and how many addresses.
  await audit({ actorId: admin.id, action: "export.newsletter", entityType: "export", entityId: "newsletter.csv", diff: { rows: rows.length } });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offplandistress-newsletter-${dubaiToday()}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
