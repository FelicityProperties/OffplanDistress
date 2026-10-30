import Link from "@/components/LocaleLink";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, brandAddress, brandName } from "@/lib/config";
import { prefillEmail } from "@/lib/newsletter";
import { cn } from "@/lib/utils";

export async function SiteFooter() {
  const [t, tn, locale, user] = await Promise.all([getT("common"), getT("newsletter"), getLocale(), getCurrentUser()]);
  // RERA: the office's licence details belong on every page of a broker's site.
  const legal = [
    BRAND.orn && t("reraOrn", { orn: BRAND.orn }),
    BRAND.licence && t("tradeLicence", { n: BRAND.licence }),
    BRAND.broker.brn && t("brokerBrn", { n: BRAND.broker.brn }),
  ].filter(Boolean);
  const columns = [
    {
      title: t("marketplace"),
      links: [
        { href: "/deals", label: t("browseDeals") },
        { href: "/sell", label: t("sellMyUnit") },
        { href: "/market", label: t("marketIndex") },
        { href: "/exit-calculator", label: t("exitCalculator") },
        { href: "/newsletter", label: tn("footer.link") },
        { href: "/dashboard", label: t("myAccount") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/how-it-works", label: t("howItWorks") },
        { href: "/fees", label: t("fees") },
        { href: "/contact", label: t("contactUs") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/terms", label: t("terms") },
        { href: "/privacy", label: t("privacy") },
        { href: "/cookies", label: t("cookies") },
      ],
    },
  ];

  return (
    <footer className="relative isolate mt-auto overflow-hidden bg-ink text-primary-foreground">
      <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-30 mask-fade-b" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/65">{t("footerBlurb")}</p>
          <ul className="mt-6 space-y-2.5 text-sm text-primary-foreground/80">
            {BRAND.email && (
              <li>
                <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-gold">
                  <Mail className="h-4 w-4 text-gold" />
                  <span dir="ltr">{BRAND.email}</span>
                </a>
              </li>
            )}
            {BRAND.phone && (
              <li>
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-gold">
                  <Phone className="h-4 w-4 text-gold" />
                  <span dir="ltr">{BRAND.phone}</span>
                </a>
              </li>
            )}
            {BRAND.whatsapp && (
              <li>
                <a href={`https://wa.me/${BRAND.whatsapp}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-gold">
                  <MessageCircle className="h-4 w-4 text-gold" />
                  WhatsApp
                </a>
              </li>
            )}
            <li>
              <a
                href={BRAND.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2.5 text-primary-foreground/70 transition-colors hover:text-gold"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="max-w-xs">{brandAddress(locale)}</span>
              </a>
            </li>
          </ul>
          {/* The daily deals newsletter (src/lib/newsletter.ts) */}
          <NewsletterForm variant="footer" source="footer" defaultEmail={prefillEmail(user)} className="mt-8" />
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/80">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-gold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/10">
        <div
          className={cn(
            "container-page flex flex-col gap-3 py-6 text-xs text-primary-foreground/60 lg:flex-row lg:items-center lg:justify-between",
            BRAND.whatsapp && "pb-24 sm:pb-6", // clear of the floating WhatsApp button
          )}
        >
          <p>
            © {new Date().getFullYear()} <bdi>{brandName(locale)}</bdi>
            {legal.map((item) => (
              <span key={item as string} className="tabular">
                {" · "}
                {item}
              </span>
            ))}
          </p>
          <p className="max-w-xl lg:text-end">{t("estimatesNote")}</p>
        </div>
      </div>
    </footer>
  );
}
