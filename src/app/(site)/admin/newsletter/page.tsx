import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { NewsletterPreview } from "@/components/admin/NewsletterPreview";
import { PHONE_BUTTON, PHONE_LINK } from "@/components/admin/phone";
import { EmptyState, Kpi, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isLocale, type Locale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { userTabs } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { dateLocale, formatDate, formatNumber } from "@/lib/format";
import {
  adminSubscribers,
  isNewsletterSource,
  PAGE_SIZE,
  recentIssues,
  subscriberStats,
  type NewsletterIssue,
  type NewsletterStatus,
} from "@/lib/newsletter";
import { cn } from "@/lib/utils";

// The daily deals newsletter (src/lib/newsletter.ts): who subscribed and where they stand, with a search and a status
// filter, the CSV export, and the last daily issues (src/lib/newsletter-issue.ts), under B's preview of today's issue.

const STATUSES: NewsletterStatus[] = ["pending", "confirmed", "unsubscribed"];
const STATUS_TONE = { pending: "warning", confirmed: "success", unsubscribed: "muted" } as const;
const ISSUES_SHOWN = 14;

/** "28 Oct 2026, 09:00" in Dubai time, in the admin's language. */
function dubaiTime(d: Date | null, locale: Locale) {
  if (!d) return "—";
  return d.toLocaleString(dateLocale(locale), {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The counts an issue's content holds (lists are counted; anything missing is 0). */
function issueCounts(content: NewsletterIssue["content"]) {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : typeof v === "number" ? v : 0);
  return { newListings: n(content.newListings), priceDrops: n(content.priceDrops), gone: n(content.gone), recipients: n(content.recipients), failed: n(content.failed) };
}

const pager =
  "inline-flex h-9 items-center gap-1 rounded-full border border-border/80 bg-card px-3 text-sm font-medium shadow-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:h-11 max-lg:px-4";
// Phones (below md): each table row is a card (the header row hidden, every value under its column's name); from md,
// the tables. One set of rows either way.
const CARD_ROW = "max-md:grid max-md:gap-x-3 max-md:gap-y-2 max-md:p-4";
const CARD_LABEL = "block text-xs font-medium text-muted-foreground md:hidden";

// Typed by hand (not PageProps<"/admin/newsletter">) so it compiles before Next regenerates its route types.
export default async function NewsletterAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = STATUSES.find((s) => s === sp.status);
  // At most a million pages, as on the users list: a page number typed far past the last stays a plain empty page.
  const page = Math.min(1_000_000, Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));
  const [stats, { rows, total }, issues, t, locale] = await Promise.all([
    subscriberStats(),
    adminSubscribers({ q, status, page }),
    recentIssues(ISSUES_SHOWN),
    getT("newsletter"),
    getLocale(),
  ]);
  // The "Account" link opens the tab of /admin/users that lists the account (as on /admin/leads).
  const tabs = await userTabs([...new Set(rows.map((r) => r.userId).filter((id): id is string => Boolean(id)))]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (o: { status?: string; page?: number } = {}) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const s = o.status ?? status ?? "";
    if (s) p.set("status", s);
    if ((o.page ?? 1) > 1) p.set("page", String(o.page));
    const qs = p.toString();
    return qs ? `/admin/newsletter?${qs}` : "/admin/newsletter";
  };

  return (
    <div className="space-y-6">
      <PageTitle title={t("admin.title")} sub={t("admin.sub")}>
        {/* Every subscriber with their consent record (src/app/api/admin/export/newsletter.csv). */}
        <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
          <a href="/api/admin/export/newsletter.csv" download>
            <Download aria-hidden /> {t("admin.export")}
          </a>
        </Button>
      </PageTitle>

      <NewsletterPreview />

      {/* Two to a row on a phone too: the figures are short. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="newsletter-kpis">
        <Kpi label={t("admin.kpi.confirmed")} value={formatNumber(stats.confirmed)} />
        <Kpi label={t("admin.kpi.pending")} value={formatNumber(stats.pending)} />
        <Kpi label={t("admin.kpi.unsubscribed")} value={formatNumber(stats.unsubscribed)} />
        <Kpi label={t("admin.kpi.confirmed7d")} value={formatNumber(stats.confirmed7d)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AdminTabs
          label={t("admin.filters")}
          current={status ?? ""}
          tabs={[["", href({ status: "" }), t("admin.filter.all")], ...STATUSES.map((s) => [s, href({ status: s }), t(`admin.status.${s}`)] as const)]}
        />
        {/* Phones: the search across the width (a 224 px field and its button were wider than a 320 px screen). */}
        <form method="get" action="/admin/newsletter" role="search" className="flex gap-2 max-sm:w-full">
          {status && <input type="hidden" name="status" value={status} />}
          <Input
            type="search"
            name="q"
            defaultValue={q}
            dir="ltr"
            aria-label={t("admin.search")}
            placeholder={t("admin.search")}
            className="w-56 max-w-full bg-card rtl:text-end max-lg:h-11 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"
          />
          <Button type="submit" size="sm" variant="outline" className={cn("h-9", PHONE_BUTTON)}>
            <Search aria-hidden /> {t("admin.searchButton")}
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={q || status ? t("admin.emptySearch") : t("admin.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{t("admin.col.email")}</TableHead>
                <TableHead>{t("admin.col.status")}</TableHead>
                <TableHead>{t("admin.col.language")}</TableHead>
                <TableHead>{t("admin.col.source")}</TableHead>
                <TableHead>{t("admin.col.subscribed")}</TableHead>
                <TableHead>{t("admin.col.confirmed")}</TableHead>
                <TableHead>{t("admin.col.unsubscribed")}</TableHead>
                <TableHead>{t("admin.col.lastSent")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  data-testid="subscriber-row"
                  data-email={r.email}
                  data-status={r.status}
                  className={cn(CARD_ROW, "max-md:grid-cols-2")}
                >
                  <TableCell className="min-w-56 wrap-anywhere max-md:col-span-2 max-md:min-w-0 max-md:p-0">
                    <p className="font-medium">
                      <bdi dir="ltr">{r.email}</bdi>
                      {/* On a card the status stands by the address (its column is hidden there). */}
                      <span className="ms-2 inline-block align-middle md:hidden">
                        <StatusPill tone={STATUS_TONE[r.status]}>{t(`admin.status.${r.status}`)}</StatusPill>
                      </span>
                    </p>
                    {r.userId && (
                      <p className="text-xs text-muted-foreground">
                        {tabs.has(r.userId) ? (
                          <Link
                            href={`/admin/users?${tabs.get(r.userId) === "pending" ? "tab=pending&" : ""}user=${r.userId}#user-${r.userId}`}
                            className={cn("font-medium text-foreground underline-offset-4 hover:underline", PHONE_LINK)}
                          >
                            {t("admin.account")}: {r.accountName ?? "—"}
                          </Link>
                        ) : (
                          <span>
                            {t("admin.account")}: {r.accountName ?? "—"}
                          </span>
                        )}
                      </p>
                    )}
                    {r.consentIp && (
                      <p className="text-xs text-muted-foreground">
                        <bdi>{t("admin.consentIp", { ip: r.consentIp })}</bdi>
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-md:hidden">
                    <StatusPill tone={STATUS_TONE[r.status]}>{t(`admin.status.${r.status}`)}</StatusPill>
                  </TableCell>
                  <TableCell className="max-md:p-0">
                    <span className={CARD_LABEL}>{t("admin.col.language")}</span>
                    {t(`admin.lang.${isLocale(r.locale) ? r.locale : "en"}`)}
                  </TableCell>
                  <TableCell className="max-md:p-0">
                    <span className={CARD_LABEL}>{t("admin.col.source")}</span>
                    {isNewsletterSource(r.source) ? t(`admin.source.${r.source}`) : r.source}
                  </TableCell>
                  {/* On a card, only the dates that happened. */}
                  {(
                    [
                      ["admin.col.subscribed", r.consentedAt],
                      ["admin.col.confirmed", r.confirmedAt],
                      ["admin.col.unsubscribed", r.unsubscribedAt],
                      ["admin.col.lastSent", r.lastSentAt],
                    ] as const
                  ).map(([label, date]) => (
                    <TableCell key={label} className={cn("whitespace-nowrap tabular max-md:p-0", !date && "max-md:hidden")}>
                      <span className={CARD_LABEL}>{t(label)}</span>
                      {formatDate(date, locale)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="tabular">
            {t("admin.showing", { from: (page - 1) * PAGE_SIZE + 1, to: (page - 1) * PAGE_SIZE + rows.length, total })}
          </p>
          {pages > 1 && (
            <nav aria-label={t("admin.pagination")} className="flex flex-wrap items-center gap-2">
              <Link
                href={href({ page: page - 1 })}
                aria-disabled={page <= 1 || undefined}
                tabIndex={page <= 1 ? -1 : undefined}
                className={cn(pager, page <= 1 && "pointer-events-none opacity-40")}
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> {t("admin.previous")}
              </Link>
              <span className="tabular">{t("admin.page", { page, pages })}</span>
              <Link
                href={href({ page: page + 1 })}
                aria-disabled={page >= pages || undefined}
                tabIndex={page >= pages ? -1 : undefined}
                className={cn(pager, page >= pages && "pointer-events-none opacity-40")}
              >
                {t("admin.next")} <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </nav>
          )}
        </div>
      )}

      <section aria-labelledby="newsletter-issues-title" className="space-y-3" data-testid="newsletter-issues">
        <div>
          <h2 id="newsletter-issues-title" className="text-lg font-semibold">
            {t("admin.issues.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("admin.issues.sub")}</p>
        </div>
        {issues.length === 0 ? (
          <EmptyState title={t("admin.issues.empty")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            {/* nowrap headers: in Chinese the narrow count columns stacked their names one character a line. On a card
                (phones) the counts share three columns under their names, without the window (the day says it). */}
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t("admin.issues.col.day")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("admin.issues.col.window")}</TableHead>
                  <TableHead className="whitespace-nowrap text-end">{t("admin.issues.col.new")}</TableHead>
                  <TableHead className="whitespace-nowrap text-end">{t("admin.issues.col.drops")}</TableHead>
                  <TableHead className="whitespace-nowrap text-end">{t("admin.issues.col.gone")}</TableHead>
                  <TableHead className="whitespace-nowrap text-end">{t("admin.issues.col.recipients")}</TableHead>
                  <TableHead className="whitespace-nowrap text-end">{t("admin.issues.col.failed")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("admin.issues.col.sentAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {issues.map((issue) => {
                  const c = issueCounts(issue.content);
                  const count = "text-end tabular max-md:p-0 max-md:text-start";
                  return (
                    <TableRow key={issue.id} data-testid="issue-row" data-day={issue.day} className={cn(CARD_ROW, "max-md:grid-cols-3")}>
                      <TableCell className="whitespace-nowrap font-medium tabular max-md:col-span-3 max-md:p-0 max-md:font-semibold">
                        {formatDate(issue.day, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground tabular max-md:hidden">
                        {dubaiTime(issue.since, locale)} → {dubaiTime(issue.until, locale)}
                      </TableCell>
                      <TableCell className={count}>
                        <span className={CARD_LABEL}>{t("admin.issues.col.new")}</span>
                        {formatNumber(c.newListings)}
                      </TableCell>
                      <TableCell className={count}>
                        <span className={CARD_LABEL}>{t("admin.issues.col.drops")}</span>
                        {formatNumber(c.priceDrops)}
                      </TableCell>
                      <TableCell className={count}>
                        <span className={CARD_LABEL}>{t("admin.issues.col.gone")}</span>
                        {formatNumber(c.gone)}
                      </TableCell>
                      <TableCell className={count}>
                        <span className={CARD_LABEL}>{t("admin.issues.col.recipients")}</span>
                        {formatNumber(c.recipients)}
                      </TableCell>
                      <TableCell className={cn(count, c.failed > 0 && "font-semibold text-destructive")}>
                        <span className={CARD_LABEL}>{t("admin.issues.col.failed")}</span>
                        {formatNumber(c.failed)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular max-md:col-span-3 max-md:p-0">
                        <span className={CARD_LABEL}>{t("admin.issues.col.sentAt")}</span>
                        {issue.sentAt ? dubaiTime(issue.sentAt, locale) : <span className="text-muted-foreground">{t("admin.issues.notSent")}</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
