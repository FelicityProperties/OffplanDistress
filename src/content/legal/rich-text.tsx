import { Fragment, type ReactNode } from "react";

/**
 * Fills `{name}` placeholders in a translated sentence with React nodes (usually links), so each language keeps
 * its own word order: richText(t("signup.acceptTerms"), { terms: <Link …/>, privacy: <Link …/> }).
 * Pure function — safe in Server and Client Components. Pass the raw template (t(key) without vars).
 */
export function richText(template: string, parts: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((chunk, i) => {
    const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
    return <Fragment key={i}>{name && name in parts ? parts[name] : chunk}</Fragment>;
  });
}
