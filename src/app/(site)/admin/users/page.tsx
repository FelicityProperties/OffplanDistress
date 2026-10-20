import { KycSelect, ResetPasswordButton, RoleSelect } from "@/components/admin/AdminControls";
import { PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { adminUsers } from "@/lib/admin";
import { formatDate } from "@/lib/format";

const INTENT = { buy: "Buyer", sell: "Seller", both: "Buyer & seller" } as const;

export default async function UsersPage() {
  await requireAdmin();
  const users = await adminUsers();
  return (
    <div className="space-y-6">
      <PageTitle title="Users" sub={`${users.length} registered accounts.`} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                </TableCell>
                <TableCell>{INTENT[u.intent]}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.listings} listings · {u.offers} offers
                </TableCell>
                <TableCell>
                  <KycSelect userId={u.id} value={u.kycStatus} />
                </TableCell>
                <TableCell>
                  <RoleSelect userId={u.id} value={u.role} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
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
