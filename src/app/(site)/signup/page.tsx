import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";
import { getCurrentUser, safeNext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Join as a buyer, seller or both to access verified distressed off-plan deals in Dubai.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, intent } = await searchParams;
  const target = safeNext(next, "");
  if (await getCurrentUser()) redirect(target || "/dashboard");

  return (
    <AuthShell title="Create your account" sub="It takes under a minute. Free for buyers and sellers.">
      <SignupForm next={target || undefined} intent={typeof intent === "string" ? intent : undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={target ? `/login?next=${encodeURIComponent(target)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
