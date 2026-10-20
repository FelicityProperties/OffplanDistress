import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";

export async function SiteFooter() {
  const t = await getT("common");
  const legal = [BRAND.orn && t("reraOrn", { orn: BRAND.orn }), t("operatedBy", { company: BRAND.company }), t("location")]
    .filter(Boolean)
    .join(" · ");
  return (
    <footer className="mt-auto bg-ink text-primary-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">{t("footerBlurb")}</p>
          {(BRAND.email || BRAND.phone) && (
            <p className="mt-4 text-sm text-primary-foreground/80" dir="ltr">
              {BRAND.email && (
                <a href={`mailto:${BRAND.email}`} className="hover:text-gold">
                  {BRAND.email}
                </a>
              )}
              {BRAND.email && BRAND.phone && " · "}
              {BRAND.phone && (
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-gold">
                  {BRAND.phone}
                </a>
              )}
            </p>
          )}
          <p className="mt-6 text-xs text-primary-foreground/50">{legal}</p>
        </div>
        <div>
          <h4 className="font-sans text-sm font-semibold">{t("marketplace")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
            <li>
              <Link href="/deals" className="hover:text-gold">
                {t("browseDeals")}
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:text-gold">
                {t("sellMyUnit")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-gold">
                {t("myAccount")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-sans text-sm font-semibold">{t("company")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
            <li>
              <Link href="/how-it-works" className="hover:text-gold">
                {t("howItWorks")}
              </Link>
            </li>
            <li>
              <Link href="/fees" className="hover:text-gold">
                {t("fees")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-gold">
                {t("contactUs")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-page py-5 text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} {BRAND.company}. {t("estimatesNote")}
        </div>
      </div>
    </footer>
  );
}
