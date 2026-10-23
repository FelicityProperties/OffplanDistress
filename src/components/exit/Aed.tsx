import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";

/**
 * An AED amount whose digits (and sign) sit in their own LTR isolate, so a minus sign or "+" never jumps to the
 * wrong side in Arabic. The currency word stays in the surrounding direction: "AED 1,200" / "1,200 درهم".
 */
export function Aed({
  value,
  locale,
  signed = false,
  approx = false,
}: {
  value: number;
  locale: Locale;
  /** Prefix positive values with "+" (gains). Negative values always get "−". */
  signed?: boolean;
  /** Prefix "≈" (estimates). */
  approx?: boolean;
}) {
  const v = Math.round(value);
  const sign = v < 0 ? "−" : signed && v > 0 ? "+" : "";
  const num = (
    <bdi dir="ltr" className="tabular">
      {sign}
      {formatNumber(Math.abs(v))}
    </bdi>
  );
  return (
    <span className="whitespace-nowrap">
      {approx && "≈ "}
      {locale === "ar" ? (
        <>
          {num} درهم
        </>
      ) : (
        <>AED {num}</>
      )}
    </span>
  );
}

/** "AED 850,000 – 1,000,000" with each end isolated. */
export function AedRange({ low, high, locale }: { low: number; high: number; locale: Locale }) {
  if (Math.round(low) === Math.round(high)) return <Aed value={high} locale={locale} />;
  const n = (v: number) => (
    <bdi dir="ltr" className="whitespace-nowrap tabular">
      {formatNumber(Math.round(v))}
    </bdi>
  );
  // The two ends may wrap onto separate lines on a phone; each number stays whole.
  return (
    <span>
      {locale === "ar" ? (
        <>
          {n(low)} – {n(high)} درهم
        </>
      ) : (
        <>
          AED {n(low)} – {n(high)}
        </>
      )}
    </span>
  );
}
