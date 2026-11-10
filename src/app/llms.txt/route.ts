import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { BRAND, FEES } from "@/lib/config";
import { formatPct } from "@/lib/format";
import { liveProjects, projectBestPct, projectCommunities, projectDevelopers, projectHandover, projectPath } from "@/lib/projects";
import { siteUrl } from "@/lib/site-url";

// /llms.txt (llmstxt.org): the site described for AI assistants, in Markdown. The format's shape: the H1, the summary
// as a blockquote, free text with no headings, then H2 sections that are lists of links ("- [name](url): notes"), which
// the reference parser (llms_txt) reads one link per line. Buyers first: how a resale below the original price works,
// the steps and the fees (the free text), the guides, the deals and every project page; then one line for sellers. Read
// from the database on every request, as the sitemap is, so the project list is the current one (projects with an
// available unit, real adverts only). In English, naming the Arabic and Chinese addresses. The address has a dot, so
// src/proxy.ts never sees it.
export const dynamic = "force-dynamic";

/** A project name as Markdown link text: one line, brackets escaped. */
const linkText = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[[\]\\]/g, "\\$&");

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", ar: "Arabic", zh: "Chinese" };

export async function GET() {
  const base = siteUrl();
  const url = (path: string, locale: Locale = DEFAULT_LOCALE) => `${base}${localePath(path, locale)}`;
  const projects = await liveProjects();
  const commission = formatPct(FEES.commissionRate);
  const vat = formatPct(FEES.vatRate);
  const dld = formatPct(FEES.dldRate);
  const buyerPays = FEES.payer === "buyer";

  const projectLines = projects.map((p) => {
    const best = projectBestPct(p);
    const underOffer = p.dealCount - p.liveCount;
    // Comma-separated facts, so a project with several developers or communities lists them with a slash; a developer
    // the listings don't name is left out. The counts and the percentage are of its available units.
    const facts = [
      p.liveCount === 1 ? "1 unit available" : `${p.liveCount} units available`,
      underOffer > 0 ? `${underOffer} under offer` : "",
      projectDevelopers(p, "en", " / ", true),
      projectCommunities(p, "en", " / "),
      `handover ${projectHandover(p, "en").replace(/^Ready\b/, "ready")}`,
      best != null ? `up to ${best}% below the original price` : "",
    ].filter(Boolean);
    return `- [${linkText(p.name)} resale](${url(projectPath(p))}): ${facts.join(", ")}`;
  });

  // Every public page has an address in each language; the deals list in each, as links.
  const languageLines = LOCALES.filter((l) => l !== DEFAULT_LOCALE).map(
    (l) =>
      `- [Deals in ${LANGUAGE_NAMES[l]}](${url("/deals", l)}): every public page is also in ${LANGUAGE_NAMES[l]}, under ${url("/", l)} (for example the project pages at ${url("/projects", l)}).`,
  );

  const text = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.tagline}. ${BRAND.name} lists Dubai off-plan units that their owners are reselling before handover, often for less than they agreed to pay the developer: a buyer pays the seller's asking price and takes over the remaining payment plan. Run by ${BRAND.company}, a RERA-licensed brokerage in Dubai (ORN ${BRAND.orn}), which handles the developer NOC and the DLD transfer.`,
    "",
    "**For buyers: buying a resale below the original price**",
    "",
    "- You pay the seller their asking price for their equity, the part of the price they have already paid the developer. Many sellers ask less than they paid in.",
    "- You take over the developer's payment plan: the remaining instalments continue to the developer on the original schedule, in your name.",
    "- The sale value is the asking price plus the balance still owed to the developer. A unit is below the original price when its sale value is lower than the price the first buyer signed with the developer in the SPA (sale and purchase agreement); every deal shows that percentage.",
    "- Each deal page shows the cash needed on transfer day (the asking price, the fees, and any overdue instalments and late fees the developer wants cleared before the NOC), the remaining payment plan and the handover date.",
    "",
    "**How it works**",
    "",
    "1. Every listing is reviewed by our team and carries a DLD advertising permit; units marked Verified have had their SPA and payment history checked against the developer's records.",
    "2. You make an offer on a unit. Our team negotiates with the seller and qualifies every buyer before the NOC.",
    "3. We check the developer's resale rules (most developers require 30–50% of the price to be paid first), apply for the developer's No Objection Certificate (NOC) and prepare the assignment.",
    "4. Settlement at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC.",
    "5. DLD issues a new Oqood in your name (a title deed for a unit already handed over), and you continue any remaining payment plan with the developer. Typically 2–5 weeks from an accepted offer to the new Oqood.",
    "",
    "**Fees**",
    "",
    buyerPays
      ? `- Our fee: ${commission} of the sale value plus ${vat} VAT on the fee, paid by the buyer when the transfer completes. Nothing upfront, and no fee if the transfer doesn't complete.`
      : `- Our fee: ${commission} of the sale value plus ${vat} VAT on the fee, paid by the seller when the transfer completes. Buyers pay us nothing.`,
    `- DLD transfer fee: ${dld} of the sale value, plus DLD registration and trustee office fees.`,
    "- Developer NOC fee: set by each developer.",
    "",
    "## Guides",
    "",
    `- [How it works](${url("/how-it-works")}): the steps from offer to the new Oqood.`,
    `- [Fees](${url("/fees")}): our fee, the DLD and developer costs, with a worked example.`,
    `- [Market](${url("/market")}): the Dubai Distress Index, live statistics computed from real listings.`,
    ...languageLines,
    "",
    "## Deals",
    "",
    `- [All deals](${url("/deals")}): every off-plan resale on the site, with filters for community, developer, cash needed on transfer day, % below the original price and handover date.`,
    `- [Projects](${url("/projects")}): every project with an available resale unit, and how buying a resale there works.`,
    ...projectLines,
    "",
    "## For sellers",
    "",
    buyerPays
      ? `- [List your unit for free](${url("/sell")}): owners who need to exit an off-plan unit list it at no cost; the buyer pays our fee.`
      : `- [List your unit for free](${url("/sell")}): owners who need to exit an off-plan unit list it at no cost; our fee is due when the transfer completes.`,
    "",
  ].join("\n");

  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
