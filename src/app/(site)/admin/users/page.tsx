import Link from "next/link";
import { KycSelect, ResetPasswordButton, RoleSelect } from "@/components/admin/AdminControls";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminUsers, pendingClaimCount } from "@/lib/admin";
import { isPlaceholderEmail } from "@/lib/claim";
import { formatDate, refCode } from "@/lib/format";
import { cn } from "@/lib/utils";

// Typed by hand (not PageProps<"/admin/users">) so it compiles before Next regenerates its route types.
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const tab = (await searchParams).tab === "pending" ? "pending" : "registered";
  const [users, pending, t, tc, locale] = await Promise.all([
    adminUsers(tab),
    pendingClaimCount(),
    getT("admin"),
    getT("common"),
    getLocale(),
  ]);
  const tabs = (
    <nav aria-label={t("users.tabs")} className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1 text-sm">
      {(
        [
          ["registered", "/admin/users", t("users.tab.registered")],
          ["pending", "/admin/users?tab=pending", `${t("users.tab.pending")} (${pending})`],
        ] as const
      ).map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          aria-current={tab === key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === key && "bg-card text-foreground shadow-card",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "pending") {
    return (
      <div className="space-y-6">
        <PageTitle title={t("users.title")} sub={t("users.pendingSub", { count: users.length })}>
          {tabs}
        </PageTitle>
        {users.length === 0 ? (
          <EmptyState title={t("users.pendingEmpty")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.name")}</TableHead>
                  <TableHead>{t("col.activity")}</TableHead>
                  <TableHead>{t("col.joined")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} id={`user-${u.id}`} className="scroll-mt-24 target:bg-gold-soft/50">
                    <TableCell>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPlaceholderEmail(u.email) ? t("users.noEmail") : <bdi dir="ltr">{u.email}</bdi>}
                        {u.phone && (
                          <>
                            {" · "}
                            {/* Never broken across lines: "+971 50 765" / "4321" reads as two numbers. */}
                            <bdi dir="ltr" className="whitespace-nowrap">
                              {u.phone}
                            </bdi>
                          </>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t("users.activity", { listings: u.listings, offers: u.offers })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.createdAt, locale)}</TableCell>
                    <TableCell>
                      {u.pendingListingId && u.pendingListingRef != null && (
                        <Link
                          href={`/admin/listings/${u.pendingListingId}`}
                          className="whitespace-nowrap text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {t("users.openListing", { ref: refCode(u.pendingListingRef) })}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title={t("users.title")} sub={t("users.sub", { count: users.length })}>
        {tabs}
      </PageTitle>
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
              // id: the seller-leads page links straight to a converted lead's account.
              <TableRow key={u.id} id={`user-${u.id}`} className="scroll-mt-24 target:bg-gold-soft/50">
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
                  {/* A buyer our team added to a deal file: no password until they set one with "Forgot password". */}
                  {!u.hasPassword && <p className="text-xs text-gold-foreground">{t("users.addedBuyer")}</p>}
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
