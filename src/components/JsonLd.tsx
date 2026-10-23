import { BRAND } from "@/lib/config";
import { siteUrl } from "@/lib/site-url";

/** Structured data for search engines, escaped as the Next.js JSON-LD guide recommends. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The licensed brokerage behind the site (RealEstateAgent), with its RERA and trade-licence numbers. */
export function organizationJsonLd() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${url}/#organization`,
    name: BRAND.name,
    legalName: BRAND.company,
    alternateName: BRAND.companyAr,
    url,
    logo: `${url}/logo.svg`,
    image: `${url}/opengraph-image`,
    description: BRAND.description,
    email: BRAND.email || undefined,
    telephone: BRAND.phone || undefined,
    address: { "@type": "PostalAddress", streetAddress: BRAND.address, addressLocality: "Dubai", addressCountry: "AE" },
    areaServed: { "@type": "City", name: "Dubai" },
    identifier: [
      BRAND.orn && { "@type": "PropertyValue", propertyID: "RERA ORN", value: BRAND.orn },
      BRAND.licence && { "@type": "PropertyValue", propertyID: "Dubai trade licence", value: BRAND.licence },
    ].filter(Boolean),
    employee: BRAND.broker.brn
      ? { "@type": "Person", name: BRAND.broker.name, identifier: { "@type": "PropertyValue", propertyID: "RERA BRN", value: BRAND.broker.brn } }
      : undefined,
  };
}
