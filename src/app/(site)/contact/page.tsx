import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { InquiryFields } from "@/components/InquiryForm";
import { SectionHeading } from "@/components/badges";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Contact us", description: `Talk to the ${BRAND.name} transactions team.` };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
      <div>
        <SectionHeading
          eyebrow="Contact"
          title="Talk to our transactions team"
          sub="Questions about a deal, the NOC process or selling your unit? Send us a message and we'll get back to you."
        />
        <ul className="mt-8 space-y-3 text-sm">
          {BRAND.whatsapp && (
            <li>
              <a href={`https://wa.me/${BRAND.whatsapp}`} className="inline-flex items-center gap-2 hover:text-gold">
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            </li>
          )}
          {BRAND.phone && (
            <li>
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-gold">
                <Phone className="h-4 w-4" /> {BRAND.phone}
              </a>
            </li>
          )}
          {BRAND.email && (
            <li>
              <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2 hover:text-gold">
                <Mail className="h-4 w-4" /> {BRAND.email}
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <InquiryFields
          type="contact"
          defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
          submitLabel="Send message"
          messagePlaceholder="How can we help?"
        />
      </div>
    </div>
  );
}
