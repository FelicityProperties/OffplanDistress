import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { AttributionCapture } from "@/components/Attribution";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SellDraftJanitor } from "@/components/sell/SellDraftJanitor";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LanguageBar } from "@/components/LanguageBar";
import { getLocale, getT, offeredLocale, tFor } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

// Every page reads the session (header) or live listings, so render per request.
export const dynamic = "force-dynamic";

/** Signed-in admin? Their visits are never counted. Same request-cached lookup as the header; a failure means "no". */
async function isStaff() {
  try {
    return (await getCurrentUser())?.role === "admin";
  } catch (err) {
    unstable_rethrow(err);
    return false;
  }
}

/** Nobody is signed in (false when the lookup failed: that is not a sign-out). Same request-cached lookup. */
async function signedOut() {
  try {
    return (await getCurrentUser()) === null;
  } catch (err) {
    unstable_rethrow(err);
    return false;
  }
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [t, staff, anonymous, locale, offer] = await Promise.all([getT("common"), isStaff(), signedOut(), getLocale(), offeredLocale()]);
  // The language bar speaks the language it offers.
  const to = offer ? tFor("common", offer) : null;
  return (
    <>
      {/* First stop for keyboard users: jump past the header to the page itself. */}
      <a
        href="#main"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lift focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {t("skipToContent")}
      </a>
      {offer && to && (
        <LanguageBar
          to={offer}
          current={locale}
          copy={{ label: to("langBar.label"), body: to("langBar.body"), cta: to("langBar.cta"), dismiss: to("langBar.dismiss") }}
        />
      )}
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppButton />
      {/* Remembers how this visit arrived (utm tags, ?ref=, landing page) in sessionStorage, for the seller forms. */}
      <AttributionCapture />
      {/* Signed out (logged out, or the session ended): no seller's saved sell-form draft stays in this browser. */}
      {anonymous && <SellDraftJanitor />}
      {/* Anonymous, cookieless page-view statistics for /admin/analytics (never for admins). */}
      <Suspense fallback={null}>
        <PageViewTracker staff={staff} />
      </Suspense>
    </>
  );
}
