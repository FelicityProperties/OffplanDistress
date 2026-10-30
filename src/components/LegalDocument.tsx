import type { ReactNode } from "react";
import Link from "@/components/LocaleLink";
import {
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Cookie,
  FileText,
  Languages,
  ListOrdered,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { richText } from "@/content/legal/rich-text";
import type { LegalContent, LegalDoc } from "@/content/legal/types";
import { intlLocale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

type DocKey = "terms" | "privacy" | "cookies";

const DOCS = [
  { key: "terms", href: "/terms", icon: FileText },
  { key: "privacy", href: "/privacy", icon: ShieldCheck },
  { key: "cookies", href: "/cookies", icon: Cookie },
] as const;

// Emails become mailto links and cookie names render as code, so the plain-string documents stay readable.
const INLINE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|\bod_[a-z]+\b)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.includes("@")) {
      return (
        <a
          key={i}
          href={`mailto:${part}`}
          dir="ltr"
          className="font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {part}
        </a>
      );
    }
    return (
      <code key={i} dir="ltr" className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
        {part}
      </code>
    );
  });
}

/**
 * "Account data: …" (or "账户数据：…" with the full-width colon) → bold lead-in. Only short labels qualify, so ordinary
 * sentences are left alone.
 */
function bullet(text: string): ReactNode {
  const m = /^([^:.;：。；]{1,60})(:\s|：)([\s\S]*)$/.exec(text);
  if (!m) return inline(text);
  return (
    <>
      <strong className="font-semibold text-foreground">{inline(m[1])}</strong>
      {m[2]}
      {inline(m[3])}
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function TocLinks({ sections, className }: { sections: LegalDoc["sections"]; className?: string }) {
  return (
    <ol className={cn("space-y-0.5 text-sm", className)}>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-3 rounded-lg px-2.5 py-1.5 leading-snug text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="shrink-0 pt-px text-xs font-semibold tabular text-gold-foreground/70">{pad(i + 1)}</span>
            <span>{s.heading}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Terms / Privacy / Cookies page: hero, summary, sticky table of contents and numbered sections. */
export async function LegalDocument({ doc, current }: { doc: LegalContent; current?: DocKey }) {
  const [locale, t] = await Promise.all([getLocale(), getT("legal")]);
  // Every locale in LOCALES has its own version; should one be missing at runtime, the English document is shown.
  const d: LegalDoc = (doc as Partial<LegalContent>)[locale] ?? doc.en;
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d.updated}T00:00:00Z`));

  return (
    <div id="top">
      <section className="relative isolate overflow-hidden bg-ink-gradient text-primary-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dots-dark opacity-60 mask-fade-b" />
        <div aria-hidden className="pointer-events-none absolute -top-32 -end-24 -z-10 h-96 w-96 rounded-full bg-glow-gold opacity-60 blur-2xl" />
        <div className="container-page py-14 sm:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-gold">
            <Scale className="size-3.5" aria-hidden />
            {t("eyebrow")}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{d.title}</h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-gold" aria-hidden />
              {/* One flex item, so the gap doesn't stack on the space before the date. */}
              <span>{richText(t("lastUpdated"), { date: <time dateTime={d.updated}>{date}</time> })}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListOrdered className="size-4 text-gold" aria-hidden />
              {t("sectionsCount", { n: d.sections.length })}
            </span>
          </p>
          <nav aria-label={t("nav.label")} className="mt-8 flex flex-wrap gap-2">
            {DOCS.map((x) => {
              const active = current === x.key;
              return (
                <Link
                  key={x.key}
                  href={x.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                    active
                      ? "border-gold/60 bg-gold text-gold-foreground shadow-gold"
                      : "border-white/15 bg-white/5 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground",
                  )}
                >
                  <x.icon className="size-4" aria-hidden />
                  {t(`nav.${x.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label={t("toc")} className="glass sticky top-24 max-h-[calc(100vh-7.5rem)] overflow-y-auto rounded-2xl p-4">
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("toc")}</p>
            <TocLinks sections={d.sections} className="mt-3" />
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <details className="group mb-8 rounded-2xl border bg-card shadow-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ListOrdered className="size-4 text-gold" aria-hidden />
                {t("toc")}
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" aria-hidden />
            </summary>
            <TocLinks sections={d.sections} className="border-t px-2.5 py-3" />
          </details>

          <div className="rounded-2xl border border-gold/30 bg-gold-soft p-6 shadow-card sm:p-7">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-foreground">
              <Sparkles className="size-4" aria-hidden />
              {t("summary")}
            </p>
            <p className="mt-3 text-[15px] leading-7 text-foreground/90">{inline(d.summary)}</p>
          </div>

          <div className="mt-2">
            {d.sections.map((s, i) => (
              <section key={s.id} aria-labelledby={s.id} className="border-b border-border/70 py-9 last:border-b-0">
                <h2 id={s.id} className="flex scroll-mt-24 items-baseline gap-3 text-2xl font-semibold leading-snug">
                  <span className="font-sans text-sm font-semibold tabular text-gold-foreground/70">{pad(i + 1)}</span>
                  <span>{s.heading}</span>
                </h2>
                {s.paragraphs?.map((p, j) => (
                  <p key={j} className="mt-4 text-[15px] leading-7 text-foreground/80">
                    {inline(p)}
                  </p>
                ))}
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2.5 text-[15px] leading-7 text-foreground/80">
                    {s.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="relative ps-6 before:absolute before:start-1.5 before:top-[0.72em] before:size-1.5 before:rounded-full before:bg-gold"
                      >
                        {bullet(b)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="relative isolate mt-6 overflow-hidden rounded-3xl bg-ink-gradient p-7 text-primary-foreground shadow-lift sm:p-9">
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -end-20 -z-10 h-72 w-72 rounded-full bg-glow-gold opacity-50 blur-2xl" />
            <h2 className="text-2xl font-semibold">{t("closing.title")}</h2>
            <p className="mt-2 text-primary-foreground/75">{t("closing.body")}</p>
            {BRAND.email && (
              <Button asChild variant="gold" className="mt-5 max-w-full">
                <a href={`mailto:${BRAND.email}`} aria-label={t("closing.email", { email: BRAND.email })}>
                  <Mail aria-hidden />
                  <span dir="ltr" className="min-w-0 break-all">
                    {BRAND.email}
                  </span>
                </a>
              </Button>
            )}
            <p className="mt-6 flex items-start gap-2 border-t border-white/10 pt-5 text-sm text-primary-foreground/70">
              <Languages className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              {t("closing.language")}
            </p>
          </div>

          <a
            href="#top"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowUp className="size-4" aria-hidden />
            {t("backToTop")}
          </a>
        </article>
      </div>
    </div>
  );
}
