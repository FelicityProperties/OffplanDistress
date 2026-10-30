import type { Locale } from "./config";
import { interpolate, type Vars } from "./define";
import { messages, type Messages, type Namespace } from "./messages";

export type TKey<N extends Namespace> = keyof Messages[N]["en"] & string;
export type TFn<N extends Namespace> = (key: TKey<N>, vars?: Vars) => string;

/**
 * Typed translator for one namespace in one language (en, ar or zh); falls back to English, then to the key itself.
 * A namespace whose block for the language is missing altogether (copy still being added) reads as English rather
 * than crashing the page: the build's type check is what enforces completeness.
 */
export function translator<N extends Namespace>(ns: N, locale: Locale): TFn<N> {
  const fallback = messages[ns].en as Record<string, string>;
  const dict = (messages[ns][locale] as Record<string, string> | undefined) ?? fallback;
  return (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars);
}
