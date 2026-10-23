import { Fragment } from "react";

// A number, optionally a range ("30–40") and/or a percentage ("25%", "85–100%").
// Each number starts and ends with a digit, so a sentence's closing "." or "," stays outside the isolate.
const NUM = /(\d(?:[\d,.]*\d)?(?:\s?[–-]\s?\d(?:[\d,.]*\d)?)?%?)/g;

/**
 * Wrap the numbers inside a translated sentence in LTR isolates, so "30–40%" or "(13) of 2008" read the same
 * way in Arabic as the amounts do (no flipped ranges or percent signs). Plain text stays plain text.
 */
export function ltr(text: string): React.ReactNode {
  const parts = text.split(NUM);
  if (parts.length === 1) return text;
  // One wrapping span, so the pieces stay a single flex item wherever the sentence is placed.
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 ? (
          // nowrap: a range like "30–40%" or "85–100%" must not break after the dash on a phone.
          <bdi key={i} dir="ltr" className="whitespace-nowrap tabular">
            {p}
          </bdi>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </span>
  );
}
