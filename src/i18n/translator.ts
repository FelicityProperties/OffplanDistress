import type { Locale } from "./config";
import { interpolate, type Vars } from "./define";
import { messages, type Messages, type Namespace } from "./messages";

export type TKey<N extends Namespace> = keyof Messages[N]["en"] & string;
export type TFn<N extends Namespace> = (key: TKey<N>, vars?: Vars) => string;

/** Typed translator for one namespace; falls back to English, then to the key itself. */
export function translator<N extends Namespace>(ns: N, locale: Locale): TFn<N> {
  const dict = messages[ns][locale] as Record<string, string>;
  const fallback = messages[ns].en as Record<string, string>;
  return (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars);
}
