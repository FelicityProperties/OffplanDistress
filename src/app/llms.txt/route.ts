import { BRAND, FEES } from "@/lib/config";
import { formatPct } from "@/lib/format";
import { liveProjects, projectBestPct, projectCommunities, projectDevelopers, projectHandover, projectPath } from "@/lib/projects";
import { siteUrl } from "@/lib/site-url";

// /llms.txt (llmstxt.org): the site described for AI assistants, in Markdown. Buyers first (how a resale below the
// original price works, the steps, the fees, the deals and every project page), then one line for sellers. Read from
// the database on every request, as the sitemap is, so the project list is the current one (real adverts only, no
// samples). In English, naming the Arabic and Chinese addresses. The address has a dot, so src/proxy.ts never sees it.
export const dynamic = "force-dynamic";

/** A project name as Markdown link text: one line, brackets escaped. */
const linkText = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[[\]\\]/g, "\\$&");

export async function GET() {
  const base = siteUrl();
  const projects = await liveProjects();
  const commission = formatPct(FEES.commissionRate);
  const vat = formatPct(FEES.vatRate);
  const dld = formatPct(FEES.dldRate);
  const buyerPays = FEES.payer === "buyer";

  const projectLines = projects.map((p) => {
    const best = projectBestPct(p);
    // Comma-separated facts, so a project with several developers or communities lists them with a slash.
    const facts = [
      p.dealCount === 1 ? "1 unit" : `${p.dealCount} units`,
      projectDevelopers(p, "en", " / "),
      projectCommunities(p, "en", " / "),
      `handover ${projectHandover(p, "en").replace(/^Ready\b/, "ready")}`,
      best != null ? `up to ${best}% below the original price` : "",
    ].filter(Boolean);
    return `- [${linkText(p.name)} resale](${base}${projectPath(p)}): ${facts.join(", ")}`;
  });

  const text = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.tagline}. ${BRAND.name} lists Dubai off-plan units that their owners are reselling before handover, often for less than they agreed to pay the developer: a buyer pays the seller's asking price and takes over the remaining payment plan. Run by ${BRAND.company}, a RERA-licensed brokerage in Dubai (ORN ${BRAND.orn}), which handles the developer NOC and the DLD transfer.`,
    "",
    "## For buyers",
    "",
    "- You pay the seller their asking price for their equity, the part of the price they have already paid the developer. Many sellers ask less than they paid in.",
    "- You take over the developer's payment plan: the remaining instalments continue to the developer on the original schedule, in your name.",
    "- The sale value is the asking price plus the balance still owed to the developer. A unit is below the original price when its sale value is lower than the price the first buyer signed with the developer in the SPA (sale and purchase agreement); every deal shows that percentage.",
    "- Each deal page shows the cash needed on transfer day (asking price, fees and any overdue instalments), the remaining payment plan and the handover date.",
    "",
    "## How it works",
    "",
    "1. Every listing is reviewed by our team and carries a DLD advertising permit; units marked Verified have had their SPA and payment history checked against the developer's records.",
    "2. You make an offer on a unit. Our team negotiates with the seller and qualifies every buyer before the NOC.",
    "3. We check the developer's resale rules (most developers require 30–50% of the price to be paid first), apply for the developer's No Objection Certificate (NOC) and prepare the assignment.",
    "4. Settlement at a DLD trustee office: the seller's asking price is paid by manager's cheque at the moment ownership moves to you, never before the NOC.",
    "5. DLD issues a new Oqood in your name, and you continue the remaining payment plan with the developer. Typically 2–5 weeks from an accepted offer to the new Oqood.",
    "",
    "## Fees",
    "",
    buyerPays
      ? `- Our fee: ${commission} of the sale value plus ${vat} VAT on the fee, paid by the buyer when the transfer completes. Nothing upfront, and no fee if the transfer doesn't complete.`
      : `- Our fee: ${commission} of the sale value plus ${vat} VAT on the fee, paid by the seller when the transfer completes. Buyers pay us nothing.`,
    `- DLD transfer fee: ${dld} of the sale value, plus DLD registration and trustee office fees.`,
    "- Developer NOC fee: set by each developer.",
    "",
    "## Deals",
    "",
    `- [All deals](${base}/deals): every off-plan resale on the site, with filters for community, developer, cash needed on transfer day, % below the original price and handover date.`,
    `- [Projects](${base}/projects): every project with resale units, and how buying a resale there works.`,
    ...projectLines,
    `- [How it works](${base}/how-it-works): the steps from offer to the new Oqood.`,
    `- [Fees](${base}/fees): our fee, the DLD and developer costs, with a worked example.`,
    `- [Market](${base}/market): the Dubai Distress Index, live statistics computed from real listings.`,
    `- Every page is also in Arabic (${base}/ar, for example ${base}/ar/deals) and in Chinese (${base}/zh, for example ${base}/zh/deals).`,
    "",
    "## For sellers",
    "",
    buyerPays
      ? `- [List your unit for free](${base}/sell): owners who need to exit an off-plan unit list it at no cost; the buyer pays our fee.`
      : `- [List your unit for free](${base}/sell): owners who need to exit an off-plan unit list it at no cost; our fee is due when the transfer completes.`,
    "",
  ].join("\n");

  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
