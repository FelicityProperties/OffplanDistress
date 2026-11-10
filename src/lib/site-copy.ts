import type { Locale } from "@/i18n/config";
import { BRAND } from "@/lib/config";

// The site's one-line description in each language, for <title>, the meta description and the installed app's manifest
// (the English comes from BRAND); the Chinese follows the glossary (期房 = off-plan, 转售 = resale, 低于原始合同价 = below the
// original price, 急售 = distressed, 开发商无异议函 = developer NOC). Kept out of src/app/layout.tsx, which may only export
// what Next reads.
export const SITE_TAGLINE: Record<Locale, string> = {
  en: BRAND.tagline,
  ar: "إعادة بيع وحدات دبي على الخارطة بأقل من السعر الأصلي",
  zh: "低于原始合同价的迪拜期房转售",
};
export const SITE_DESCRIPTION: Record<Locale, string> = {
  en: BRAND.description,
  ar: "اشترِ وحدات دبي على الخارطة بأقل من سعر الإطلاق. يعرض الملاك الذين يرغبون في الخروج وحداتهم، ونتحقق نحن من المستندات ونطابق المشترين ونتولى شهادة عدم الممانعة ونقل الملكية.",
  zh: "以低于开发商售价购入迪拜期房。急需退出的业主在此挂牌，我们核实文件、撮合买家，并办理开发商无异议函（NOC）与迪拜土地局（DLD）过户。",
};
