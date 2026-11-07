import type { Metadata } from "next";
import { AuthAltLink, AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("password");
  return { title: t("meta.forgot.title"), description: t("meta.forgot.description") };
}

// Signed-in visitors may use this too (e.g. to change a password they've forgotten on another device).
export default async function ForgotPasswordPage() {
  const [t, tc, user] = await Promise.all([getT("password"), getT("common"), getCurrentUser()]);

  return (
    <AuthShell title={t("forgot.title")} sub={t("forgot.sub")}>
      <ForgotPasswordForm defaultEmail={user?.email} />
      <AuthAltLink lead={t("forgot.remembered")} href="/login">
        {tc("logIn")}
      </AuthAltLink>
    </AuthShell>
  );
}
