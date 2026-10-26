import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getT } from "@/i18n/server";

// Every page reads the session (header) or live listings, so render per request.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const t = await getT("common");
  return (
    <>
      {/* First stop for keyboard users: jump past the header to the page itself. */}
      <a
        href="#main"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lift focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </>
  );
}
