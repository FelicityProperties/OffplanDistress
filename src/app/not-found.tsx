import { NOT_FOUND_BOX, NotFoundContent, notFoundMetadata } from "@/components/NotFoundContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return notFoundMetadata();
}

/**
 * An address no route matches (/ar/no-such-page): shown on its own in the root layout, so it brings the skip link,
 * header, main landmark and footer of every other page (src/app/(site)/layout.tsx). A page that calls notFound() (a
 * withdrawn deal, say) shows src/app/(site)/not-found.tsx inside the site layout instead.
 */
export default async function NotFound() {
  const t = await getT("common");
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lift focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={cn(NOT_FOUND_BOX, "outline-none")}>
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
