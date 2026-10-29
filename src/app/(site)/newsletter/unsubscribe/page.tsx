import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { MailMinus, MailWarning, MailX } from "lucide-react";
import { NewsletterCard } from "@/components/NewsletterCard";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { maskEmail, subscriberByToken, unsubscribeApiPath } from "@/lib/newsletter";

// The unsubscribe link of every issue. Opening it changes nothing: the page shows the (masked) address and a button,
// whose POST goes to src/app/api/newsletter/unsubscribe (the same endpoint mail providers use for one-click
// unsubscribe) and comes back here, now saying "you're unsubscribed". A mail client scanning the issue's links can't
// unsubscribe anyone that way.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("newsletter");
  return { title: t("meta.unsubscribe.title"), robots: { index: false }, referrer: "no-referrer" };
}

// Typed by hand (not PageProps<"/newsletter/unsubscribe">) so it compiles before Next regenerates its route types.
export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const [t, locale, { t: raw }] = await Promise.all([getT("newsletter"), getLocale(), searchParams]);
  const token = typeof raw === "string" ? raw.trim() : "";
  const row = token ? await subscriberByToken(token) : null;

  if (!row) {
    return (
      <NewsletterCard icon={MailWarning} tone="warning" title={t("unsub.invalidTitle")} body={t("unsub.invalidBody")}>
        <Button asChild variant="outline" size="lg">
          <Link href="/newsletter">{t("unsub.resubscribe")}</Link>
        </Button>
      </NewsletterCard>
    );
  }
  const masked = (
    <bdi dir="ltr" className="font-medium text-foreground">
      {maskEmail(row.email)}
    </bdi>
  );
  if (row.status === "unsubscribed") {
    const [before, after = ""] = t("unsub.doneBody").split("{email}");
    return (
      <NewsletterCard
        icon={MailX}
        tone="muted"
        title={t("unsub.doneTitle")}
        body={
          <>
            {before}
            {masked}
            {after}
          </>
        }
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/newsletter">{t("unsub.resubscribe")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/deals">{t("unsub.back")}</Link>
          </Button>
        </div>
      </NewsletterCard>
    );
  }
  const [before, after = ""] = t("unsub.body").split("{email}");
  return (
    <NewsletterCard
      icon={MailMinus}
      tone="muted"
      title={t("unsub.title")}
      body={
        <>
          {before}
          {masked}
          {after}
        </>
      }
    >
      {/* A plain form, so the button works from any mail client's browser, with or without JavaScript. */}
      <form method="post" action={unsubscribeApiPath(token)} className="flex flex-wrap justify-center gap-3" data-testid="unsubscribe-form">
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" size="lg">
          {t("unsub.submit")}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/deals">{t("unsub.back")}</Link>
        </Button>
      </form>
    </NewsletterCard>
  );
}
