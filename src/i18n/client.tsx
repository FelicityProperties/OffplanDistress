"use client";

import { createContext, useContext, useMemo } from "react";
import { dirOf, type Locale } from "./config";
import type { Namespace } from "./messages";
import { translator } from "./translator";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useDir() {
  return dirOf(useLocale());
}

/** Translator for one namespace in Client Components. */
export function useT<N extends Namespace>(ns: N) {
  const locale = useLocale();
  return useMemo(() => translator(ns, locale), [ns, locale]);
}
