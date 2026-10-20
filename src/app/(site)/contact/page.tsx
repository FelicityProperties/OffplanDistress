import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { InquiryFields } from "@/components/InquiryForm";
import { SectionHeading } from "@/components/badges";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("contact.metaTitle"), description: t("contact.metaDescription", { brand: BRAND.name }) };
}

export default async function ContactPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getT("marketing")]);
  return (
    <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
      <div>
        <SectionHeading eyebrow={t("contact.eyebrow")} title={t("contact.title")} sub={t("contact.sub")} />
        <ul className="mt-8 space-y-3 text-sm">
          {BRAND.whatsapp && (
            <li>
              <a href={`https://wa.me/${BRAND.whatsapp}`} className="inline-flex items-center gap-2 hover:text-gold">
                <MessageCircle className="h-4 w-4" /> {t("contact.whatsapp")}
              </a>
            </li>
          )}
          {BRAND.phone && (
            <li>
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-gold">
                <Phone className="h-4 w-4" /> <span dir="ltr">{BRAND.phone}</span>
              </a>
            </li>
          )}
          {BRAND.email && (
            <li>
              <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2 hover:text-gold">
                <Mail className="h-4 w-4" /> <bdi>{BRAND.email}</bdi>
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <InquiryFields
          type="contact"
          defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
          submitLabel={t("contact.submit")}
          messagePlaceholder={t("contact.placeholder")}
        />
      </div>
    </div>
  );
}
