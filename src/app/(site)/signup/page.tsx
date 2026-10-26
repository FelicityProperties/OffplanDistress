import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";
import { getT } from "@/i18n/server";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { authHref, leadFromAuthParams } from "@/lib/leads";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("meta.signup.title"), description: t("meta.signup.description") };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, intent, lead } = await searchParams;
  // From the free estimate's thank-you link: the account takes over that lead and the sell form starts from it.
  const leadId = leadFromAuthParams(lead, next);
  const target = safeNext(next, leadId ? `/sell?lead=${leadId}` : "");
  if (await getCurrentUser()) redirect(target || "/dashboard");
  const [t, tc] = await Promise.all([getT("auth"), getT("common")]);

  return (
    <AuthShell title={t("signup.title")} sub={t("signup.sub")}>
      <SignupForm next={target || undefined} intent={typeof intent === "string" ? intent : undefined} lead={leadId} />
      <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
        {t("signup.haveAccount")}{" "}
        {/* Logging in instead of signing up claims the estimate's lead just the same. */}
        <Link
          href={authHref("/login", target, leadId)}
          className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tc("logIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
