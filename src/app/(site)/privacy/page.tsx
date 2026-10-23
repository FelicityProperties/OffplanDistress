import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacyPolicy } from "@/content/legal/privacy";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("legal");
  return { title: t("meta.privacy.title"), description: t("meta.privacy.description") };
}

export default function PrivacyPage() {
  return <LegalDocument doc={privacyPolicy} current="privacy" />;
}
