import Link from "next/link";
import { Search } from "lucide-react";
import { KycSelect, ResetPasswordButton, RoleSelect } from "@/components/admin/AdminControls";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PHONE_BUTTON, PHONE_LINK } from "@/components/admin/phone";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { adminUsers, pendingClaimCount, registeredCount, userTabs, USERS_PAGE_SIZE } from "@/lib/admin";
import { isPlaceholderEmail } from "@/lib/claim";
import { formatDate, refCode } from "@/lib/format";
import { cn, isUuid } from "@/lib/utils";

// Phones (below md): each row is a card, its header row hidden, so a person's name stays with their KYC, role and Reset
// (the table put those off-screen); from md, the table. One set of rows either way: a row keeps its id (#user-…, the
// links from leads, follow-ups and the analytics journeys) and its controls.
const TABLE = "max-md:block max-md:min-w-0";
const ROW = "max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:p-4";
/** A column's name above its value on a card (the table's header row is hidden there). */
const CARD_LABEL = "mb-1 text-xs font-medium text-muted-foreground md:hidden";

// Typed by hand (not PageProps<"/admin/users">) so it compiles before Next regenerates its route types.
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  // One account (`user`, from a link elsewhere in the console: leads, newsletter, follow-ups, analytics), shown on its
  // tab whatever page it would be on; an account on neither tab leaves the list as it is.
  const userTab = isUuid(sp.user) ? (await userTabs([sp.user])).get(sp.user) : undefined;
  const userId = userTab ? (sp.user as string) : undefined;
  const tab = userTab ?? (sp.tab === "pending" ? "pending" : "registered");
  // A name, an email or a phone number (in any format: "050 111 2222" finds +971 50 111 2222), searched across every
  // account of the tab (adminUsers), a page at a time.
  const q = userId ? "" : typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = userId ? 1 : Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const [{ rows: users, total }, pending, registered, t, tc, locale] = await Promise.all([
    adminUsers(tab, { q, page, userId }),
    pendingClaimCount(),
    tab === "registered" ? registeredCount() : 0,
    getT("admin"),
    getT("common"),
    getLocale(),
  ]);
  // The tab's own count (the title's), whatever the search finds.
  const all = tab === "pending" ? pending : registered;
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const base = tab === "pending" ? "/admin/users?tab=pending" : "/admin/users";
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (tab === "pending") p.set("tab", "pending");
    if (q) p.set("q", q);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };
  const pager = pages > 1 && (
    <nav aria-label={t("pipeline.page", { page, pages })} className="flex flex-wrap items-center gap-3 text-sm">
      {page > 1 && (
        <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
          <Link href={pageHref(page - 1)}>{t("pipeline.prev")}</Link>
        </Button>
      )}
      <span className="text-muted-foreground tabular">{t("pipeline.page", { page, pages })}</span>
      {page < pages && (
        <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
          <Link href={pageHref(page + 1)}>{t("pipeline.next")}</Link>
        </Button>
      )}
    </nav>
  );
  const tabs = (
    <AdminTabs
      label={t("users.tabs")}
      current={tab}
      tabs={[
        ["registered", "/admin/users", t("users.tab.registered")],
        ["pending", "/admin/users?tab=pending", `${t("users.tab.pending")} (${pending})`],
      ]}
    />
  );
  const search = (
    <div className="space-y-2">
      <form method="get" action="/admin/users" role="search" className="flex w-full gap-2 sm:max-w-md">
        {tab === "pending" && <input type="hidden" name="tab" value="pending" />}
        <Input
          type="search"
          name="q"
          defaultValue={q}
          // What is typed sets the direction (an e-mail, a phone number, an Arabic name); empty, the field follows the
          // page, so an Arabic placeholder starts at the right and its start is what shows when it is cut off.
          dir="auto"
          maxLength={100}
          aria-label={t("users.search")}
          placeholder={t("users.search")}
          className="min-w-0 flex-1 bg-card rtl:placeholder-shown:[direction:rtl] max-lg:h-11"
        />
        <Button type="submit" variant="outline" className="max-lg:h-11">
          <Search aria-hidden /> {t("pipeline.searchSubmit")}
        </Button>
      </form>
      {(q || userId) && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          {q && <span className="wrap-anywhere">{t("users.results", { q, count: total })}</span>}
          <Link href={base} className={cn("font-medium text-foreground underline underline-offset-4 hover:no-underline", PHONE_LINK)}>
            {t("users.clearSearch")}
          </Link>
        </p>
      )}
    </div>
  );
  const noMatch = <EmptyState title={t("users.noResults", { q })} />;

  if (tab === "pending") {
    return (
      <div className="space-y-6">
        <PageTitle title={t("users.title")} sub={t("users.pendingSub", { count: all })}>
          {tabs}
        </PageTitle>
        {all > 0 && search}
        {all === 0 ? (
          <EmptyState title={t("users.pendingEmpty")} />
        ) : users.length === 0 ? (
          noMatch
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table className={TABLE}>
              <TableHeader className="max-md:hidden">
                <TableRow>
                  <TableHead>{t("col.name")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("col.activity")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("col.joined")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {users.map((u) => (
                  <TableRow key={u.id} id={`user-${u.id}`} className={cn("target:bg-gold-soft/50 lg:scroll-mt-24", ROW)}>
                    <TableCell className="max-md:col-span-2 max-md:p-0">
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground wrap-anywhere">
                        {isPlaceholderEmail(u.email) ? t("users.noEmail") : <bdi dir="ltr">{u.email}</bdi>}
                        {u.phone && (
                          <>
                            {" · "}
                            {/* Never broken across lines: "+971 50 765" / "4321" reads as two numbers. A link, as on Leads and
                                Inquiries: the pages tell iPhones not to make phone numbers into links themselves. */}
                            <a href={`tel:${u.phone.replace(/[^\d+]/g, "")}`} className={cn("hover:underline", PHONE_LINK)}>
                              <bdi dir="ltr" className="whitespace-nowrap">
                                {u.phone}
                              </bdi>
                            </a>
                          </>
                        )}
                      </p>
                      {/* On a card, the hidden columns in one line. */}
                      <p className="text-xs text-muted-foreground md:hidden">
                        {t("users.activity", { listings: u.listings, offers: u.offers })} · {t("users.joinedOn", { date: formatDate(u.createdAt, locale) })}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground max-md:hidden">
                      {t("users.activity", { listings: u.listings, offers: u.offers })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground max-md:hidden">{formatDate(u.createdAt, locale)}</TableCell>
                    <TableCell className="max-md:col-span-2 max-md:p-0">
                      {u.pendingListingId && u.pendingListingRef != null && (
                        <Link
                          href={`/admin/listings/${u.pendingListingId}`}
                          className={cn("whitespace-nowrap text-sm font-medium underline-offset-4 hover:underline", PHONE_LINK)}
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
        {pager}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title={t("users.title")} sub={t("users.sub", { count: all })}>
        {tabs}
      </PageTitle>
      {search}
      {users.length === 0 ? (
        noMatch
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          {/* min-w: in Chinese the short columns otherwise shrank to one character, their text stacked (nowrap too). */}
          <Table className={cn("min-w-[640px]", TABLE)}>
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{t("col.name")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("col.type")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("col.activity")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("col.kyc")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("col.role")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("col.joined")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {users.map((u) => (
                // id: the seller-leads page links straight to a converted lead's account.
                <TableRow key={u.id} id={`user-${u.id}`} className={cn("target:bg-gold-soft/50 lg:scroll-mt-24", ROW)}>
                  <TableCell className="max-md:col-span-2 max-md:p-0">
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground wrap-anywhere">
                      {/* A phone-only seller's account holds our own placeholder address, never theirs. */}
                      {isPlaceholderEmail(u.email) ? t("users.noEmail") : <bdi dir="ltr">{u.email}</bdi>}
                      {u.phone && (
                        <>
                          {" · "}
                          <a href={`tel:${u.phone.replace(/[^\d+]/g, "")}`} className={cn("hover:underline", PHONE_LINK)}>
                            <bdi dir="ltr" className="whitespace-nowrap">
                              {u.phone}
                            </bdi>
                          </a>
                        </>
                      )}
                    </p>
                    {/* Added by our team, no password yet: a buyer linked to a deal file (they set one with "Forgot
                        password"), or a seller whose ownership was confirmed from their signed Form A. */}
                    {!u.hasPassword && u.dealBuyer && <p className="text-xs text-gold-foreground">{t("users.addedBuyer")}</p>}
                    {!u.hasPassword && u.listings > 0 && <p className="text-xs text-gold-foreground">{t("users.addedSeller")}</p>}
                    {/* On a card, the hidden columns in one line. */}
                    <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                      {tc(`intent.${u.intent}`)} · {t("users.activity", { listings: u.listings, offers: u.offers })} ·{" "}
                      {t("users.joinedOn", { date: formatDate(u.createdAt, locale) })}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap max-md:hidden">{tc(`intent.${u.intent}`)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground max-md:hidden">
                    {t("users.activity", { listings: u.listings, offers: u.offers })}
                  </TableCell>
                  <TableCell className="max-md:p-0">
                    <p className={CARD_LABEL}>{t("col.kyc")}</p>
                    <KycSelect userId={u.id} value={u.kycStatus} className="max-md:w-full" />
                  </TableCell>
                  <TableCell className="max-md:p-0">
                    <p className={CARD_LABEL}>{t("col.role")}</p>
                    <RoleSelect userId={u.id} value={u.role} className="max-md:w-full" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground max-md:hidden">{formatDate(u.createdAt, locale)}</TableCell>
                  <TableCell className="max-md:col-span-2 max-md:p-0">
                    <ResetPasswordButton userId={u.id} name={u.fullName} className="max-md:w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pager}
    </div>
  );
}
