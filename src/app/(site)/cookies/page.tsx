import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { cookiePolicy } from "@/content/legal/cookies";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("legal");
  return { title: t("meta.cookies.title"), description: t("meta.cookies.description") };
}

export default function CookiesPage() {
  return <LegalDocument doc={cookiePolicy} current="cookies" />;
}
