import { intlLocale, type Locale } from "@/i18n/config";
import { AED_PER_USD } from "./config";

// Digits stay Latin in both languages (UAE convention); Arabic swaps "AED" for "درهم" and localises words.

const numberFmt = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });

export function formatNumber(value: number) {
  return numberFmt.format(value);
}

export function formatAED(value: number | null | undefined, locale: Locale = "en") {
  if (value == null) return "—";
  return locale === "ar" ? `${numberFmt.format(value)} درهم` : `AED ${numberFmt.format(value)}`;
}

/** US-dollar equivalent of a dirham amount at the fixed peg (AED_PER_USD), for overseas buyers. */
export function formatUSDFromAED(aed: number | null | undefined, locale: Locale = "en") {
  if (aed == null) return "—";
  const usd = Math.round(aed / AED_PER_USD);
  return locale === "ar" ? `${numberFmt.format(usd)} دولار أمريكي` : `USD ${numberFmt.format(usd)}`;
}

export function formatAEDCompact(value: number | null | undefined, locale: Locale = "en") {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const ar = locale === "ar";
  let n: string;
  let unit: string;
  // The unit follows the rounded figure: 999,999 is "1M", not "1000K" (and 999,995,000 is "1B", not "1000M").
  if (abs >= 1_000_000_000 || Number((abs / 1_000_000).toFixed(2)) >= 1000) {
    n = (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
    unit = ar ? " مليار" : "B";
  } else if (abs >= 1_000_000 || Math.round(abs / 1_000) >= 1000) {
    n = (value / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
    unit = ar ? " مليون" : "M";
  } else if (abs >= 1_000) {
    n = String(Math.round(value / 1_000));
    unit = ar ? " ألف" : "K";
  } else {
    n = String(value);
    unit = "";
  }
  return ar ? `${n}${unit} درهم` : `AED ${n}${unit}`;
}

export function formatPct(value: number | null | undefined, digits = 0) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined, locale: Locale = "en") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(locale === "ar" ? intlLocale("ar") : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const AR_QUARTERS = ["الربع الأول", "الربع الثاني", "الربع الثالث", "الربع الرابع"];

/** "2027-12-31" → "Q4 2027" / "الربع الرابع 2027" */
export function formatQuarter(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return locale === "ar" ? "يُحدَّد لاحقاً" : "TBC";
  const d = new Date(value);
  const q = Math.floor(d.getUTCMonth() / 3);
  return locale === "ar" ? `${AR_QUARTERS[q]} ${d.getUTCFullYear()}` : `Q${q + 1} ${d.getUTCFullYear()}`;
}

export function refCode(refNo: number) {
  return `OD-${1000 + refNo}`;
}

export function parseRefCode(code: string): number | null {
  const m = /^OD-(\d+)$/i.exec(code.trim());
  if (!m) return null;
  const n = Number(m[1]) - 1000;
  // ref_no is an int4 serial: anything bigger can't exist (and would make Postgres throw)
  return n > 0 && n <= 2_147_483_647 ? n : null;
}

export function timeAgo(value: Date | string, locale: Locale = "en") {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto", style: "short" });
  if (s < 60) return rtf.format(0, "second");
  const m = Math.round(s / 60);
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.round(m / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const days = Math.round(h / 24);
  if (days < 30) return rtf.format(-days, "day");
  return formatDate(d, locale);
}
