import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";

export async function SiteFooter() {
  const t = await getT("common");
  const legal = BRAND.orn ? ` · ${t("reraOrn", { orn: BRAND.orn })}` : "";
  const columns = [
    {
      title: t("marketplace"),
      links: [
        { href: "/deals", label: t("browseDeals") },
        { href: "/sell", label: t("sellMyUnit") },
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
            <li className="inline-flex items-center gap-2.5 text-primary-foreground/60">
              <MapPin className="h-4 w-4 text-gold" />
              {t("location")}
            </li>
          </ul>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">{col.title}</h4>
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
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-primary-foreground/50 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.company}
            {legal}
          </p>
          <p className="max-w-xl lg:text-end">{t("estimatesNote")}</p>
        </div>
      </div>
    </footer>
  );
}
