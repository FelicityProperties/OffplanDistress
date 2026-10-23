import type { Metadata } from "next";
import { CtaBand } from "@/components/CtaBand";
import { DistressReport } from "@/components/market/DistressReport";
import { IndexPending } from "@/components/market/IndexPending";
import { MarketHero } from "@/components/market/MarketHero";
import { Methodology } from "@/components/market/Methodology";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { getDistressIndex } from "@/lib/market";
import { siteUrl } from "@/lib/site-url";

// Rendered per request (the (site) layout is force-dynamic): every visit recomputes the index from the database,
// so there is no revalidate window to configure here.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("market");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical: "/market" },
    openGraph: { title: t("meta.title"), description: t("meta.description"), url: "/market" },
  };
}

export default async function MarketPage() {
  const [index, t, locale] = await Promise.all([getDistressIndex(), getT("market"), getLocale()]);

  // schema.org Dataset: describes the page for search engines; it carries no figures of its own.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("meta.title"),
    description: t("meta.description"),
    url: `${siteUrl()}/market`,
    inLanguage: locale,
    isAccessibleForFree: true,
    dateModified: index.asOf.toISOString(),
    spatialCoverage: { "@type": "Place", name: "Dubai, United Arab Emirates" },
    creator: { "@type": "Organization", name: BRAND.company, url: siteUrl() },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MarketHero index={index} />
      {index.ready ? <DistressReport index={index} /> : <IndexPending index={index} />}
      {!index.ready && <div className="h-20 sm:h-24" aria-hidden />}
      <Methodology />
      <CtaBand />
    </>
  );
}
