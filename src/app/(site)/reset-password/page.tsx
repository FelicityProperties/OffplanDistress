import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { passwordResets } from "@/db/schema";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("password");
  // The token is in the URL: keep the page out of search results and never send it on as a referrer.
  return { title: t("meta.reset.title"), robots: { index: false }, referrer: "no-referrer" };
}

/** True when the emailed token exists, hasn't been used and hasn't expired. The action re-checks on submit. */
async function tokenIsUsable(token: string) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return false;
  const [row] = await db
    .select({ id: passwordResets.id })
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.id, createHash("sha256").update(token).digest("hex")),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// Typed by hand (not PageProps<"/reset-password">) so it compiles before Next regenerates its route types.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token.trim() : "";
  const [t, usable] = await Promise.all([getT("password"), value ? tokenIsUsable(value) : false]);

  if (!usable) {
    return (
      <AuthShell
        title={value ? t("reset.invalidTitle") : t("reset.missingTitle")}
        sub={value ? t("reset.invalidBody") : t("reset.missingBody")}
      >
        <Button asChild className="w-full" size="lg">
          <Link href="/forgot-password">{t("reset.requestNew")}</Link>
        </Button>
        <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("backToLogin")}
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("reset.title")} sub={t("reset.sub")}>
      <ResetPasswordForm token={value} />
    </AuthShell>
  );
}
