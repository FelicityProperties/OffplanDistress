import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT("common");
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFoundTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/deals"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("browseDeals")}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {t("goHome")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
