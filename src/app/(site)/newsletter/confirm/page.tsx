import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ArrowRight, MailCheck, MailOpen, MailWarning } from "lucide-react";
import { confirmSubscriptionAction } from "@/app/actions/newsletter";
import { NewsletterCard } from "@/components/NewsletterCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { maskEmail, subscriberByToken } from "@/lib/newsletter";

// The confirmation link of the double opt-in email. Opening it changes nothing: the page shows the (masked) address and
// a "Confirm my subscription" button, and only that button's POST confirms it (confirmSubscriptionAction), coming back
// here with "you're in". A mail gateway that opens every link of an email on delivery can't subscribe anyone that way.
// A link that no longer works (replaced, or unsubscribed since) offers the form again.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("newsletter");
  // The token is in the URL: keep the page out of search results and never send it to another site as a referrer
  // ("strict-origin": the site's address only). Not "no-referrer": under it a browser posts the button's form without
  // JavaScript (or before the page hydrates) with `Origin: null`, which Next refuses for a server action.
  return { title: t("meta.confirm.title"), robots: { index: false }, referrer: "strict-origin" };
}

// Typed by hand (not PageProps<"/newsletter/confirm">) so it compiles before Next regenerates its route types.
export default async function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const [t, { t: raw, done }] = await Promise.all([getT("newsletter"), searchParams]);
  const token = typeof raw === "string" ? raw.trim() : "";
  const row = token ? await subscriberByToken(token) : null;

  if (!row || row.status === "unsubscribed") {
    return (
      <NewsletterCard icon={MailWarning} tone="warning" title={t("confirm.invalidTitle")} body={t("confirm.invalidBody")}>
        <NewsletterForm variant="page" source="newsletter" className="text-start" />
      </NewsletterCard>
    );
  }
  const masked = (
    <bdi dir="ltr" className="font-medium text-foreground">
      {maskEmail(row.email)}
    </bdi>
  );
  if (row.status === "pending") {
    const [before, after = ""] = t("confirm.pendingBody").split("{email}");
    return (
      <NewsletterCard
        icon={MailOpen}
        tone="muted"
        title={t("confirm.pendingTitle")}
        body={
          <>
            {before}
            {masked}
            {after}
          </>
        }
      >
        {/* A form posting to a server action: the button works from any mail client's browser, with or without JavaScript. */}
        <form action={confirmSubscriptionAction} className="flex flex-wrap justify-center gap-3" data-testid="confirm-form">
          <input type="hidden" name="t" value={token} />
          <Button type="submit" size="lg">
            {t("confirm.submit")}
          </Button>
        </form>
      </NewsletterCard>
    );
  }
  // Confirmed: just now by the button above ("done"), or before.
  const already = done !== "1";
  const [before, after = ""] = t(already ? "confirm.alreadyBody" : "confirm.doneBody").split("{email}");
  return (
    <NewsletterCard
      icon={MailCheck}
      title={t(already ? "confirm.alreadyTitle" : "confirm.doneTitle")}
      body={
        <>
          {before}
          {masked}
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
