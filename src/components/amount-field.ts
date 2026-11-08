"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { formatNumber } from "@/lib/format";

/** Arabic-Indic and Persian digits (an Arabic keyboard types them) as Latin ones, and the Arabic decimal point as ".". */
function latin(s: string) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10)).replace(/٫/g, ".");
}

/** What a whole-dirham field holds: the amount (digits only) and the fils typed after a decimal point (null: none). */
export type AmountState = { digits: string; fils: string | null };

/** The field's text for a state: "1,723,000", or "1,723,000.00" while fils are shown. */
export function amountText({ digits, fils }: AmountState) {
  return (digits ? formatNumber(Number(digits)) : "") + (fils === null ? "" : `.${fils}`);
}

/**
 * One edit of a whole-dirham field: `value` is what the field holds after it, `caret` where the caret is, `key` the key
 * last pressed. Thousands separators come back as typed; Backspace or Delete on one takes the digit beside it. A decimal
 * point and the fils after it ("1,723,000.00", typed or pasted from a statement) are kept apart and never count: the
 * amount stays 1,723,000, never 172,300,000. A point anywhere else ("1.723.000") is read as a thousands separator, as a
 * comma is. Returns the new state and how many digits (and the point) the caret goes after.
 */
export function editAmount(prev: AmountState, value: string, caret: number | null, key: string | null, max: number) {
  const raw = latin(value);
  const at = Math.min(caret ?? raw.length, raw.length);
  // The decimal point: the one already there, else a point with at most two digits after it, at the end.
  const point = prev.fils !== null ? raw.indexOf(".") : raw.search(/\.\d{0,2}$/);
  let digits = (point < 0 ? raw : raw.slice(0, point)).replace(/\D/g, "");
  const fils = point < 0 ? null : raw.slice(point + 1).replace(/\D/g, "").slice(0, 2);
  let before = 0;
  for (let i = 0; i < at; i++) if (/\d/.test(raw[i]) || i === point) before++;
  if (prev.fils !== null && point < 0 && digits === prev.digits + prev.fils) {
    // The point deleted: the fils go with it.
    digits = prev.digits;
    before = Math.min(before, digits.length);
  } else if (digits === prev.digits && fils === prev.fils && raw.length < amountText(prev).length) {
    // Backspace / Delete on a thousands separator takes the digit beside it.
    if (key === "Backspace" && before > 0 && before <= digits.length) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before -= 1;
    } else if (key === "Delete" && before < digits.length) {
      digits = digits.slice(0, before) + digits.slice(before + 1);
    }
  }
  const lead = digits.length - digits.replace(/^0+(?=\d)/, "").length;
  return { state: { digits: digits.slice(lead, lead + max), fils }, caretAfter: Math.max(0, before - lead) };
}

/**
 * The typing behind a whole-dirham amount field (an offer, a counter-offer, an asking price), as editAmount describes.
 * `digits` is the amount, digits only, at most `max` of them; the fils show until the field is left.
 */
export function useAmountField(digits: string, setDigits: (digits: string) => void, max: number) {
  const ref = useRef<HTMLInputElement>(null);
  const [fils, setFils] = useState<string | null>(null);
  const caretAfter = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);
  const text = amountText({ digits, fils });

  useLayoutEffect(() => {
    const el = ref.current;
    const want = caretAfter.current;
    if (!el || want == null || document.activeElement !== el) return;
    caretAfter.current = null;
    // After as many digits (and the point) as were before it.
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < want; pos++) if (/[\d.]/.test(text[pos])) seen++;
    el.setSelectionRange(pos, pos);
  }, [text]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    lastKey.current = e.key;
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = editAmount({ digits, fils }, e.target.value, e.target.selectionStart, lastKey.current, max);
    caretAfter.current = next.caretAfter;
    setFils(next.state.fils);
    setDigits(next.state.digits);
  };

  // Left: the field shows the amount as it counts.
  const onBlur = () => setFils(null);

  return { ref, text, onKeyDown, onChange, onBlur };
}
