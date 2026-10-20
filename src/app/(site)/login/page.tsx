import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Log in", description: "Log in to manage your listings, offers and watchlist." };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNext(next, "");
  if (await getCurrentUser()) redirect(target || "/dashboard");

  return (
    <AuthShell title="Welcome back" sub={`Log in to your ${BRAND.name} account.`}>
      <LoginForm next={target || undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={target ? `/signup?next=${encodeURIComponent(target)}` : "/signup"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Forgot your password?{" "}
        <Link href="/contact" className="underline-offset-4 hover:underline">
          Contact us
        </Link>{" "}
        and we&apos;ll reset it.
      </p>
    </AuthShell>
  );
}
