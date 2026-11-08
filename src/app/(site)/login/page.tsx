import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthAltLink, AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { authHref, leadFromAuthParams } from "@/lib/leads";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  // Not a page for search results (every ?next= variant would be a copy of it); its links are still followed.
  return { title: t("meta.login.title"), description: t("meta.login.description"), robots: { index: false, follow: true } };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, lead } = await searchParams;
  // From the free estimate's thank-you link (via its sign-up page): logging in claims that lead, as signing up does,
  // and the sell form starts from it.
  const leadId = leadFromAuthParams(lead, next);
  const target = safeNext(next, leadId ? `/sell?lead=${leadId}` : "");
  if (await getCurrentUser()) redirect(localePath(target || "/dashboard", await getLocale()));
  const t = await getT("auth");

  return (
    <AuthShell title={t("login.title")} sub={t("login.sub", { brand: BRAND.name })}>
      <LoginForm next={target || undefined} lead={leadId} />
      <AuthAltLink lead={t("login.newHere")} href={authHref("/signup", target, leadId)}>
        {t("login.createAccount")}
      </AuthAltLink>
    </AuthShell>
  );
}
