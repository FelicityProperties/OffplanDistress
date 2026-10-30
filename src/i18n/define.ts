/**
 * Declare one namespace of UI copy. English is the source of truth; TypeScript fails the build if the Arabic or the
 * Chinese object is missing a key (or has an extra one).
 *
 *   export default defineMessages({
 *     en: { title: "Browse deals", found: "{count} deals found" },
 *     ar: { title: "تصفح الصفقات", found: "{count} صفقة متاحة" },
 *     zh: { title: "浏览房源", found: "找到 {count} 套房源" },
 *   });
 */
export function defineMessages<const T extends Record<string, string>>(m: {
  en: T;
  ar: { [K in keyof T]: string };
  zh: { [K in keyof T]: string };
}) {
  return m as { en: { [K in keyof T]: string }; ar: { [K in keyof T]: string }; zh: { [K in keyof T]: string } };
}

export type Vars = Record<string, string | number | null | undefined>;

export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, k: string) => (vars[k] == null ? match : String(vars[k])));
}

