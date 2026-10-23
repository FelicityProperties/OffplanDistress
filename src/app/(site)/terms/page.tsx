import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsOfUse } from "@/content/legal/terms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("legal");
  return { title: t("meta.terms.title"), description: t("meta.terms.description") };
}

export default function TermsPage() {
  return <LegalDocument doc={termsOfUse} current="terms" />;
}
