import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { AuthShell } from "@/components/AuthShell";
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
      <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
        {t("forgot.remembered")}{" "}
        <Link href="/login" className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {tc("logIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
