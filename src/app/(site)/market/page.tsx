import type { Metadata } from "next";
import { CtaBand } from "@/components/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { DistressReport } from "@/components/market/DistressReport";
import { IndexPending } from "@/components/market/IndexPending";
import { MarketHero } from "@/components/market/MarketHero";
import { Methodology } from "@/components/market/Methodology";
import { htmlLang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { getDistressIndex } from "@/lib/market";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

// Rendered per request (the (site) layout is force-dynamic): every visit recomputes the index from the database,
// so there is no revalidate window to configure here.

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("market"), getLocale()]);
  // One address per language whatever the query string (/market, /ar/market), naming each other.
  const alternates = alternatesFor("/market", locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates,
    openGraph: { ...openGraphBase(locale), title: t("meta.title"), description: t("meta.description"), url: alternates?.canonical },
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
    url: `${siteUrl()}${localePath("/market", locale)}`,
    inLanguage: htmlLang(locale),
    isAccessibleForFree: true,
    dateModified: index.asOf.toISOString(),
    spatialCoverage: { "@type": "Place", name: "Dubai, United Arab Emirates" },
    // the same organisation node the root layout emits (src/components/JsonLd.tsx), linked by its @id
    // The organization node is declared once, site-wide (src/components/JsonLd.tsx); refer to it by @id only.
    creator: { "@id": `${siteUrl()}/#organization` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <MarketHero index={index} />
      {index.ready ? <DistressReport index={index} /> : <IndexPending index={index} />}
      {!index.ready && <div className="h-20 sm:h-24" aria-hidden />}
      <Methodology />
      <CtaBand />
    </>
  );
}
