"use client";

import { createContext, useContext, useMemo } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { dirOf, type Locale } from "./config";
import type { Namespace } from "./messages";
import { translator } from "./translator";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // Radix primitives (Select, RadioGroup, Dropdown…) read their direction from this provider.
  return (
    <LocaleContext value={locale}>
      <DirectionProvider dir={dirOf(locale)}>{children}</DirectionProvider>
    </LocaleContext>
  );
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
