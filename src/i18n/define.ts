/**
 * Declare one namespace of UI copy. English is the source of truth; TypeScript fails the build if the
 * Arabic object is missing a key (or has an extra one).
 *
 *   export default defineMessages({
 *     en: { title: "Browse deals", found: "{count} deals found" },
 *     ar: { title: "تصفح الصفقات", found: "{count} صفقة متاحة" },
 *   });
 */
export function defineMessages<const T extends Record<string, string>>(m: {
  en: T;
  ar: { [K in keyof T]: string };
}) {
  return m as { en: { [K in keyof T]: string }; ar: { [K in keyof T]: string } };
}

export type Vars = Record<string, string | number | null | undefined>;

export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, k: string) => (vars[k] == null ? match : String(vars[k])));
}

