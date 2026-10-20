import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/config";

export function SiteFooter() {
  const legal = [BRAND.orn && `RERA ORN ${BRAND.orn}`, `Operated by ${BRAND.company}`, BRAND.location]
    .filter(Boolean)
    .join(" · ");
  return (
    <footer className="mt-auto bg-ink text-primary-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">
            Dubai&apos;s marketplace for distressed off-plan units. Verified SPAs, protected settlement, developer NOC and
            DLD transfer handled for you.
          </p>
          {(BRAND.email || BRAND.phone) && (
            <p className="mt-4 text-sm text-primary-foreground/80">
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
          <h4 className="font-sans text-sm font-semibold">Marketplace</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
            <li>
              <Link href="/deals" className="hover:text-gold">
                Browse deals
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:text-gold">
                Sell my unit
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-gold">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-sans text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
            <li>
              <Link href="/how-it-works" className="hover:text-gold">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/fees" className="hover:text-gold">
                Fees
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-gold">
                Contact us
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-page py-5 text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} {BRAND.company}. Prices and fees shown are estimates until confirmed by the
          developer and Dubai Land Department.
        </div>
      </div>
    </footer>
  );
}
