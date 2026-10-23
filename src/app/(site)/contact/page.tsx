import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { InquiryFields } from "@/components/InquiryForm";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("contact.metaTitle"), description: t("contact.metaDescription", { brand: BRAND.name }) };
}

type Tile = { key: string; icon: LucideIcon; label: string; value: ReactNode; href?: string };

const tileClass =
  "group flex h-full items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-card transition duration-300";
const linkClass = "hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function ContactPage() {
  const [user, t, tc] = await Promise.all([getCurrentUser(), getT("marketing"), getT("common")]);

  // Phone and WhatsApp only appear once they're configured (see BRAND in src/lib/config.ts).
  const tiles: Tile[] = [];
  if (BRAND.email) {
    tiles.push({ key: "email", icon: Mail, label: t("contact.tile.email"), value: <bdi className="wrap-anywhere">{BRAND.email}</bdi>, href: `mailto:${BRAND.email}` });
  }
  if (BRAND.phone) {
    tiles.push({
      key: "phone",
      icon: Phone,
      label: t("contact.tile.phone"),
      value: <span dir="ltr">{BRAND.phone}</span>,
      href: `tel:${BRAND.phone.replace(/\s/g, "")}`,
    });
  }
  if (BRAND.whatsapp) {
    tiles.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: t("contact.tile.whatsapp"),
      value: t("contact.whatsapp"),
      href: `https://wa.me/${BRAND.whatsapp}`,
    });
  }
  if (BRAND.location) {
    tiles.push({ key: "location", icon: MapPin, label: t("contact.tile.location"), value: tc("location") });
  }

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute -start-40 -top-32 -z-10 h-[28rem] w-[28rem] bg-glow-gold opacity-40" />
        <div className="container-page py-16 sm:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {t("contact.eyebrow")}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl">{t("contact.title")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("contact.sub")}</p>
        </div>
      </section>

      <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="space-y-10">
          <ul className="grid gap-4">
            {tiles.map(({ key, icon: Icon, label, value, href }) => {
              const body = (
                <>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground transition-colors group-hover:bg-gold">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className="mt-1 block font-medium text-foreground">{value}</span>
                  </span>
                </>
              );
              return (
                <li key={key}>
                  {href ? (
                    <a href={href} className={`${tileClass} ${linkClass}`}>
                      {body}
                    </a>
                  ) : (
                    <div className={tileClass}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="rounded-3xl border border-border/70 bg-secondary/60 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">{t("contact.next.title")}</h2>
            <ol className="mt-6 space-y-5">
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n} className="flex items-start gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-gradient text-sm font-semibold text-primary-foreground tabular">
                    {n}
                  </span>
                  <p className="pt-1 leading-relaxed text-muted-foreground">{t(`contact.next.${n}`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-glow-gold opacity-30" />
            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-lift sm:p-8">
              <h2 className="text-2xl font-semibold">{t("contact.form.title")}</h2>
              <div className="mt-6">
                <InquiryFields
                  type="contact"
                  defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
                  submitLabel={t("contact.submit")}
                  messagePlaceholder={t("contact.placeholder")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
