import type { AnchorHTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { translator } from "@/i18n/translator";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

// Our WhatsApp deals community, "OffplanDistress Deals | Dubai" (BRAND.whatsappCommunity, NEXT_PUBLIC_WHATSAPP_COMMUNITY
// overrides the link): announcement-only, members can't see each other's numbers. No hooks and no "use client", so the
// same component renders on the server (home, /deals, the deal page) and inside client components (the enquiry form's
// "sent" state); the caller passes the page's language. Copy: messages/community.ts.

/** WhatsApp's glyph, as on the floating button (src/components/WhatsAppButton.tsx). Decorative. */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="currentColor" className={className}>
      <path d="M16.04 3C8.9 3 3.1 8.78 3.1 15.9c0 2.27.6 4.5 1.74 6.46L3 29l6.83-1.79a12.9 12.9 0 0 0 6.2 1.58h.01c7.13 0 12.93-5.79 12.93-12.9 0-3.45-1.35-6.69-3.79-9.12A12.83 12.83 0 0 0 16.04 3Zm0 23.6h-.01a10.7 10.7 0 0 1-5.46-1.5l-.39-.23-4.05 1.06 1.08-3.94-.25-.4a10.66 10.66 0 0 1-1.64-5.69c0-5.9 4.82-10.7 10.73-10.7 2.86 0 5.55 1.12 7.58 3.14a10.62 10.62 0 0 1 3.14 7.57c0 5.9-4.82 10.7-10.73 10.7Zm5.88-8.01c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.29.32-1.12 1.1-1.12 2.68s1.15 3.11 1.31 3.32c.16.21 2.26 3.45 5.47 4.83.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

/**
 * A join link of the community. Every one on the site is this element: it opens the invite in a new tab (the WhatsApp
 * app on a phone), and data-wa="community" files the tap under "community" in /admin/analytics
 * (src/components/analytics/PageViewTracker.tsx, which records links to chat.whatsapp.com). Renders nothing without a
 * link.
 */
export function CommunityLink({ children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">) {
  if (!BRAND.whatsappCommunity) return null;
  return (
    <a {...props} href={BRAND.whatsappCommunity} target="_blank" rel="noopener" data-wa="community">
      {children}
    </a>
  );
}

/** The compact line's words: the band's title and button (the /deals list), under a deal's WhatsApp button, after an enquiry. */
export type CommunityLine = "deals" | "deal" | "sent";

/**
 * The invitation to the community. "band": a navy panel with the community's name, the title, what members get and the
 * gold join button (the home page, the end of /deals); `className` places the section. "compact": one tidy line, the
 * whole of it a link, with the words of `line`.
 */
export function WhatsAppCommunity({
  locale,
  variant = "band",
  line = "deals",
  className,
}: {
  locale: Locale;
  variant?: "band" | "compact";
  line?: CommunityLine;
  className?: string;
}) {
  if (!BRAND.whatsappCommunity) return null;
  const t = translator("community", locale);

  if (variant === "compact") {
    const words = line === "deal" ? t("line.deal") : line === "sent" ? t("line.sent") : t("title");
    return (
      <CommunityLink
        data-testid={`community-line-${line}`}
        className={cn(
          // 44 px at least: one target for the thumb, whichever part of the line it lands on. Below 360 px (a deal's
          // price card is 238 px wide there) a tighter gap and no arrow leave the words a line less. break-keep: a
          // Chinese word (加入, 我们, 社群) is never split, its lines break at the spaces around "WhatsApp" and after
          // punctuation (as the install card's title); a run too long for the line still wraps rather than overflow.
          "group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-gold/40 bg-card px-3 py-2.5 text-sm shadow-card transition break-keep wrap-break-word hover:border-gold hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[359px]:gap-2.5",
          className,
        )}
      >
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-sm max-[359px]:h-8 max-[359px]:w-8">
          <WhatsAppGlyph className="h-5 w-5 max-[359px]:h-[1.125rem] max-[359px]:w-[1.125rem]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Balanced lines: a phrase ("قبل غيرك", "every week") stays together, no word is left alone on a line. */}
          <span className="font-medium leading-snug text-foreground text-balance">{words}</span>
          {/* On /deals the title asks, the button's words answer (under it on phones, at the end of the line from sm). */}
          {line === "deals" && (
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-gold-foreground underline decoration-gold decoration-2 underline-offset-4">
              {t("button")}
            </span>
          )}
        </span>
        <ArrowRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-gold-foreground/70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5 max-[359px]:hidden"
        />
        <span className="sr-only"> {t("opens")}</span>
      </CommunityLink>
    );
  }

  return (
    <section aria-labelledby="community-band-title" data-testid="community-band" className={cn("reveal", className)}>
      {/* The side padding of the newsletter band (NewsletterBand.tsx), stacked under it on the home page: one edge. */}
      <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-5 py-9 text-primary-foreground shadow-lift sm:px-14 sm:py-12">
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
        <div aria-hidden className="absolute -bottom-32 -start-24 -z-10 h-80 w-80 bg-glow-gold opacity-50" />
        {/* WhatsApp's glyph, large and faint, off the end edge: this band is the WhatsApp one. */}
        <WhatsAppGlyph className="pointer-events-none absolute -end-12 -top-10 -z-10 h-64 w-64 text-primary-foreground/[0.05] max-sm:hidden" />
        <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
          <div className="min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 py-1 ps-1 pe-3.5 text-xs font-semibold text-gold">
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
                <WhatsAppGlyph className="h-3.5 w-3.5" />
              </span>
              {/* The name as WhatsApp shows it, Latin in every language. */}
              <bdi dir="ltr" className="min-w-0">
                {BRAND.whatsappCommunityName}
              </bdi>
            </p>
            <h2 id="community-band-title" className="mt-4 text-3xl font-semibold leading-tight text-balance text-primary-foreground sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-primary-foreground/75">{t("text")}</p>
          </div>
          {/* One line down to 320 px (a tighter padding and gap below 360 px); if it ever wraps, the lines are balanced
              and a Chinese word stays whole ("免费加入 / WhatsApp 社群"). */}
          <CommunityLink
            data-testid="community-join"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gold px-6 py-3 text-center text-base font-semibold leading-tight text-gold-foreground text-balance break-keep shadow-gold transition hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-ink max-[359px]:gap-2 max-[359px]:px-4 sm:w-auto sm:justify-self-start lg:justify-self-end"
          >
            <WhatsAppGlyph className="h-5 w-5 shrink-0" />
            {t("button")}
            <span className="sr-only"> {t("opens")}</span>
          </CommunityLink>
        </div>
      </div>
    </section>
  );
}
