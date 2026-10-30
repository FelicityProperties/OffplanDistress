import { BRAND, FEES } from "@/lib/config";

// Company details and commercial terms for the legal texts, built from src/lib/config.ts so the config stays
// the single source of truth. Optional details (ORN, licence, phone, address) are left out when empty.

export const LEGAL_UPDATED = "2026-10-30";

const pct = (rate: number) => `${Math.round(rate * 10_000) / 100}%`;

export const RATES = {
  commission: pct(FEES.commissionRate),
  vat: pct(FEES.vatRate),
  dld: pct(FEES.dldRate),
};

export const BUYER_PAYS = FEES.payer === "buyer";

/** Keeps a Latin run (company name, email, licence number) intact inside Arabic text. */
export const iso = (s: string) => `\u2068${s}\u2069`;

const addressAr = BRAND.addressAr.trim();

export const OP = {
  site: BRAND.name,
  company: BRAND.company,
  /** Where to write to us, for use inside a sentence ("contact us at …"). */
  email: BRAND.email || "the address on our Contact page",
  /** "Felicity Properties LLC, a real-estate brokerage in Dubai, United Arab Emirates, … (RERA ORN …)" */
  identityEn: [
    `${BRAND.company}, a real-estate brokerage based in ${BRAND.location}`,
    BRAND.licence && `holding commercial licence No. ${BRAND.licence} issued by the ${BRAND.licenceAuthority}`,
    BRAND.orn && `registered with the Real Estate Regulatory Agency (RERA) of the Dubai Land Department under Office Registration Number (ORN) ${BRAND.orn}`,
  ]
    .filter(Boolean)
    .join(", "),
  identityAr: [
    `${BRAND.companyAr}، وهي شركة وساطة عقارية مقرها دبي، الإمارات العربية المتحدة`,
    BRAND.licence && `حاصلة على الرخصة التجارية رقم ${iso(BRAND.licence)} الصادرة عن ${BRAND.licenceAuthorityAr}`,
    BRAND.orn && `ومسجلة لدى مؤسسة التنظيم العقاري (ريرا) التابعة لدائرة الأراضي والأملاك في دبي برقم تسجيل المكتب ${iso(BRAND.orn)}`,
  ]
    .filter(Boolean)
    .join("، "),
  companyAr: BRAND.companyAr,
  emailAr: BRAND.email ? iso(BRAND.email) : "العنوان المبيّن في صفحة التواصل",
  // Chinese keeps the Latin legal name (no Chinese company name is registered) and needs no bidi isolates.
  identityZh: [
    `${BRAND.company}，一家位于阿联酋迪拜的房地产经纪公司`,
    BRAND.licence && `持有迪拜经济和旅游部（${BRAND.licenceAuthority}）颁发的第 ${BRAND.licence} 号商业执照`,
    BRAND.orn && `在迪拜土地局（DLD）下属的迪拜房地产监管局（RERA）注册，经纪公司注册号（ORN）为 ${BRAND.orn}`,
  ]
    .filter(Boolean)
    .join("，"),
  companyZh: BRAND.company,
  emailZh: BRAND.email || "我们联系页面上所列的地址",
};

/** Contact lines for the closing "Contact us" sections. */
export const contactBulletsEn = [
  BRAND.email && `Email: ${BRAND.email}`,
  BRAND.phone && `Telephone: ${BRAND.phone}`,
  BRAND.address.trim() && `Address: ${BRAND.address.trim()}`,
  BRAND.orn && `RERA Office Registration Number (ORN): ${BRAND.orn}`,
  BRAND.licence && `Commercial licence No.: ${BRAND.licence}`,
].filter((x): x is string => Boolean(x));

export const contactBulletsAr = [
  BRAND.email && `البريد الإلكتروني: ${iso(BRAND.email)}`,
  BRAND.phone && `الهاتف: ${iso(BRAND.phone)}`,
  BRAND.address.trim() && `العنوان: ${addressAr}`,
  BRAND.orn && `رقم تسجيل المكتب لدى مؤسسة التنظيم العقاري (ريرا): ${iso(BRAND.orn)}`,
  BRAND.licence && `رقم الرخصة التجارية: ${iso(BRAND.licence)}`,
].filter((x): x is string => Boolean(x));

// The postal address stays in English on Chinese pages: it is what couriers, maps and official letters use.
export const contactBulletsZh = [
  BRAND.email && `电子邮箱：${BRAND.email}`,
  BRAND.phone && `电话：${BRAND.phone}`,
  BRAND.address.trim() && `地址：${BRAND.address.trim()}`,
  BRAND.orn && `迪拜房地产监管局（RERA）经纪公司注册号（ORN）：${BRAND.orn}`,
  BRAND.licence && `商业执照号：${BRAND.licence}`,
].filter((x): x is string => Boolean(x));
