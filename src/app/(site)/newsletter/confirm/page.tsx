import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ArrowRight, MailCheck, MailWarning } from "lucide-react";
import { NewsletterCard } from "@/components/NewsletterCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { confirm, maskEmail } from "@/lib/newsletter";

// The confirmation link of the double opt-in email: opening it confirms the address (src/lib/newsletter.ts confirm).
// A link that no longer works (replaced, or unsubscribed since) offers the form again.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("newsletter");
  // The token is in the URL: keep the page out of search results and never send it on as a referrer.
  return { title: t("meta.confirm.title"), robots: { index: false }, referrer: "no-referrer" };
}

// Typed by hand (not PageProps<"/newsletter/confirm">) so it compiles before Next regenerates its route types.
export default async function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const [t, { t: token }] = await Promise.all([getT("newsletter"), searchParams]);
  const result = typeof token === "string" ? await confirm(token.trim()) : { status: "invalid" as const, email: null };

  if (result.status === "invalid") {
    return (
      <NewsletterCard icon={MailWarning} tone="warning" title={t("confirm.invalidTitle")} body={t("confirm.invalidBody")}>
        <NewsletterForm variant="page" source="newsletter" className="text-start" />
      </NewsletterCard>
    );
  }
  const already = result.status === "already";
  const [before, after = ""] = t(already ? "confirm.alreadyBody" : "confirm.doneBody").split("{email}");
  return (
    <NewsletterCard
      icon={MailCheck}
      title={t(already ? "confirm.alreadyTitle" : "confirm.doneTitle")}
      body={
        <>
          {before}
          <bdi dir="ltr" className="font-medium text-foreground">
            {maskEmail(result.email ?? "")}
          </bdi>
          {after}
        </>
      }
    >
      <Button asChild size="lg">
        <Link href="/deals">
          {t("confirm.cta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </Link>
      </Button>
    </NewsletterCard>
  );
}
