import Link from "@/components/LocaleLink";
import { Mail, MapPin, MessageCircle, Phone, UsersRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { CommunityLink } from "@/components/WhatsAppCommunity";
import { getLocale, getT } from "@/i18n/server";
import { assistantEnabled } from "@/lib/assistant";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, brandAddress, brandName } from "@/lib/config";
import { prefillEmail } from "@/lib/newsletter";
import { cn } from "@/lib/utils";

export async function SiteFooter() {
  const [t, tn, tw, locale, user] = await Promise.all([getT("common"), getT("newsletter"), getT("community"), getLocale(), getCurrentUser()]);
  // The floating buttons in the end corner (WhatsAppButton, AssistantWidget).
  const floating = Boolean(BRAND.whatsapp) || assistantEnabled();
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
      {/* Phones: the link columns side by side (Marketplace beside Company over Legal), so the footer stays short. */}
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-12 md:py-16">
        <div className="col-span-2 md:col-span-1">
          <Logo tone="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/65">{t("footerBlurb")}</p>
          {/* Below lg every link is a 44 px row, easy to hit with a thumb. */}
          <ul className="mt-6 space-y-2.5 text-sm text-primary-foreground/80 max-lg:mt-4 max-lg:space-y-0">
            {BRAND.email && (
              <li>
                <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-gold max-lg:min-h-11">
                  <Mail className="h-4 w-4 text-gold" />
                  <span dir="ltr">{BRAND.email}</span>
                </a>
              </li>
            )}
            {BRAND.phone && (
              <li>
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-gold max-lg:min-h-11">
                  <Phone className="h-4 w-4 text-gold" />
                  <span dir="ltr">{BRAND.phone}</span>
                </a>
              </li>
            )}
            {BRAND.whatsapp && (
              <li>
                <a href={`https://wa.me/${BRAND.whatsapp}`} data-wa="footer" className="inline-flex items-center gap-2.5 transition-colors hover:text-gold max-lg:min-h-11">
                  <MessageCircle className="h-4 w-4 text-gold" />
                  WhatsApp
                </a>
              </li>
            )}
            {/* Next to the chat: the WhatsApp deals community (src/components/WhatsAppCommunity.tsx). */}
            {BRAND.whatsappCommunity && (
              <li>
                <CommunityLink className="inline-flex items-center gap-2.5 transition-colors hover:text-gold max-lg:min-h-11">
                  <UsersRound className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  {tw("footer")}
                  <span className="sr-only"> {tw("opens")}</span>
                </CommunityLink>
              </li>
            )}
            <li>
              <a
                href={BRAND.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2.5 text-primary-foreground/70 transition-colors hover:text-gold max-lg:py-2.5"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="max-w-xs">{brandAddress(locale)}</span>
              </a>
            </li>
          </ul>
          {/* The daily deals newsletter (src/lib/newsletter.ts) */}
          <NewsletterForm variant="footer" source="footer" defaultEmail={prefillEmail(user)} className="mt-8" />
        </div>
        {columns.map((col, i) => (
          <div key={col.title} className={cn(i === 0 && "row-span-2 md:row-span-1")}>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/80 max-lg:mt-2 max-lg:space-y-0">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-gold max-lg:flex max-lg:min-h-11 max-lg:items-center">
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
            // Clear of the floating buttons (WhatsApp, and FeliBot above it) at the end corner: the row's lines (the
            // licence numbers, the estimates note) wrap beside them, on phones as from sm up, so at the very end of a
            // page they are never under one; from 2xl the centred row ends well before them and lines up with the
            // columns above again.
            floating && "max-sm:pe-[calc(var(--fab-size,3rem)+var(--fab-edge,1rem)+0.5rem)] sm:max-2xl:pe-24",
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
