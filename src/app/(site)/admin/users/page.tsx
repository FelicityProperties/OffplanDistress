import { KycSelect, ResetPasswordButton, RoleSelect } from "@/components/admin/AdminControls";
import { PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminUsers } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default async function UsersPage() {
  await requireAdmin();
  const [users, t, tc, locale] = await Promise.all([adminUsers(), getT("admin"), getT("common"), getLocale()]);
  return (
    <div className="space-y-6">
      <PageTitle title={t("users.title")} sub={t("users.sub", { count: users.length })} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.name")}</TableHead>
              <TableHead>{t("col.type")}</TableHead>
              <TableHead>{t("col.activity")}</TableHead>
              <TableHead>{t("col.kyc")}</TableHead>
              <TableHead>{t("col.role")}</TableHead>
              <TableHead>{t("col.joined")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    <bdi dir="ltr">{u.email}</bdi>
                    {u.phone && (
                      <>
                        {" · "}
                        <bdi dir="ltr">{u.phone}</bdi>
                      </>
                    )}
                  </p>
                </TableCell>
                <TableCell>{tc(`intent.${u.intent}`)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t("users.activity", { listings: u.listings, offers: u.offers })}
                </TableCell>
                <TableCell>
                  <KycSelect userId={u.id} value={u.kycStatus} />
                </TableCell>
                <TableCell>
                  <RoleSelect userId={u.id} value={u.role} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt, locale)}</TableCell>
                <TableCell>
                  <ResetPasswordButton userId={u.id} name={u.fullName} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
