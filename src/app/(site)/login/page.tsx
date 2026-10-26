import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { getT } from "@/i18n/server";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { authHref, leadFromAuthParams } from "@/lib/leads";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("meta.login.title"), description: t("meta.login.description") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, lead } = await searchParams;
  // From the free estimate's thank-you link (via its sign-up page): logging in claims that lead, as signing up does,
  // and the sell form starts from it.
  const leadId = leadFromAuthParams(lead, next);
  const target = safeNext(next, leadId ? `/sell?lead=${leadId}` : "");
  if (await getCurrentUser()) redirect(target || "/dashboard");
  const t = await getT("auth");

  return (
    <AuthShell title={t("login.title")} sub={t("login.sub", { brand: BRAND.name })}>
      <LoginForm next={target || undefined} lead={leadId} />
      <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
        {t("login.newHere")}{" "}
        <Link
          href={authHref("/signup", target, leadId)}
          className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("login.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
