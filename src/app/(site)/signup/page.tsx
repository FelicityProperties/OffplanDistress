import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";
import { getT } from "@/i18n/server";
import { getCurrentUser, safeNext } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("meta.signup.title"), description: t("meta.signup.description") };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, intent, lead } = await searchParams;
  // From the free estimate's thank-you link: the account takes over that lead and the sell form starts from it.
  const leadId =
    typeof lead === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead) ? lead : undefined;
  const target = safeNext(next, leadId ? `/sell?lead=${leadId}` : "");
  if (await getCurrentUser()) redirect(target || "/dashboard");
  const [t, tc] = await Promise.all([getT("auth"), getT("common")]);

  return (
    <AuthShell title={t("signup.title")} sub={t("signup.sub")}>
      <SignupForm next={target || undefined} intent={typeof intent === "string" ? intent : undefined} lead={leadId} />
      <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
        {t("signup.haveAccount")}{" "}
        <Link
          href={target ? `/login?next=${encodeURIComponent(target)}` : "/login"}
          className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tc("logIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
