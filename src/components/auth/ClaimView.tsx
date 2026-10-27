import Link from "@/components/LocaleLink";
import { MessageCircle } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { ClaimForm } from "@/components/auth/ClaimForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser, isOwnerEmail } from "@/lib/auth";
import { type Claim, claimPath, findClaim, isPlaceholderEmail } from "@/lib/claim";
import { BRAND } from "@/lib/config";
import { formatAED, formatNumber, formatQuarter, refCode } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";

/** "m•••@gmail.com": enough for the seller to recognise their account, without spelling it out to anyone else. */
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain ?? ""}`;
}

/**
 * What the seller is confirming: the listing as our team entered it, with the figures buyers will see (the sell form's
 * review step shows the same ones before its confirmation).
 */
async function Summary({ claim }: { claim: Claim }) {
  const [t, ts, tc, tm, tl, locale] = await Promise.all([
    getT("password"),
    getT("sell"),
    getT("common"),
    getT("marketing"),
    getT("legal"),
    getLocale(),
  ]);
  const ref = refCode(claim.refNo);
  const rows: [string, React.ReactNode][] = [
    [t("claim.summary.ref"), <bdi key="ref">{ref}</bdi>],
    [t("claim.summary.project"), <bdi key="project">{claim.projectName}</bdi>],
    [ts("review.developer"), <bdi key="developer">{developerName(tc, claim.developer, claim.developerOther)}</bdi>],
    [
      t("claim.summary.unit"),
      <span key="unit">
        {tc(`unit.${claim.unitType}`)} · {tc("sqft", { n: formatNumber(claim.sizeSqft) })} ·{" "}
        <bdi>{communityName(tc, claim.community, claim.communityOther)}</bdi>
      </span>,
    ],
    [ts("review.purchasePrice"), formatAED(claim.originalPrice, locale)],
    [ts("review.paid"), formatAED(claim.amountPaid, locale)],
    [tc("handover"), formatQuarter(claim.handoverDate, locale)],
    [t("claim.summary.asking"), formatAED(claim.askingPrice, locale)],
  ];
  const fix = BRAND.whatsapp ? `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm("whatsapp.prefill.claimFix", { ref }))}` : null;
  return (
    <section aria-labelledby="claim-summary" className="mb-6 rounded-xl border bg-card p-4 shadow-card">
      <h2 id="claim-summary" className="font-sans text-sm font-semibold">
        {t("claim.summary")}
      </h2>
      <dl className="mt-2 divide-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 text-end font-medium wrap-anywhere tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("claim.summaryNote")}
        {fix && (
          <>
            {" "}
            <a
              href={fix}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="claim-fix-whatsapp"
            >
              {t("claim.contact")}
              <span className="sr-only"> {tl("newTab")}</span>
            </a>
          </>
        )}
      </p>
    </section>
  );
}

/** A chat with our team that opens with the seller's request: a new link (the old one expired or was used). */
async function WhatsAppLink() {
  const [t, tm, tl] = await Promise.all([getT("password"), getT("marketing"), getT("legal")]);
  if (!BRAND.whatsapp) return null;
  return (
    <Button asChild variant="outline" className="w-full" size="lg">
      <a
        href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm("whatsapp.prefill.claimExpired"))}`}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="claim-expired-whatsapp"
      >
        <MessageCircle aria-hidden /> {t("claim.contact")}
        <span className="sr-only">{tl("newTab")}</span>
      </a>
    </Button>
  );
}

/** The claim message went out in the seller's language; a phone set to another one opens the page in that one. */
async function LanguageOffer({ claim }: { claim: Claim }) {
  const locale = await getLocale();
  if (!isLocale(claim.locale) || claim.locale === locale) return null;
  return (
    <div className="mb-4 flex justify-end">
      <LocaleSwitcher className="border border-border/70 bg-card" />
    </div>
  );
}

/**
 * /reset-password?claim=1&token=…: a seller confirms the listing our team entered for them. Works signed out (opened
 * from WhatsApp on a phone); an account that already has a password has to be signed in, and is never given a new one.
 */
export async function ClaimView({ token }: { token: string }) {
  const [t, claim, me] = await Promise.all([getT("password"), token ? findClaim(token) : null, getCurrentUser()]);
  const usable = claim && claim.role === "user" && !isOwnerEmail(claim.email) && !claim.ownershipConfirmedAt;
  if (!usable) {
    return (
      <AuthShell title={t("claim.invalidTitle")} sub={t("claim.invalidBody")}>
        <WhatsAppLink />
        <p className="mt-8 border-t border-border/70 pt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="rounded-sm font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (claim.hasPassword && me?.id !== claim.userId) {
    const email = maskEmail(claim.email);
    return (
      <AuthShell title={t("claim.loginTitle")} sub={me ? t("claim.otherAccount", { email }) : t("claim.loginBody", { email })}>
        <LanguageOffer claim={claim} />
        <Summary claim={claim} />
        {me ? (
          <form action={logout}>
            <Button type="submit" className="w-full" size="lg">
              {t("claim.logout")}
            </Button>
          </form>
        ) : (
          <Button asChild className="w-full" size="lg">
            <Link href={`/login?next=${encodeURIComponent(claimPath(token))}`}>{t("claim.loginCta")}</Link>
          </Button>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("claim.title")} sub={claim.hasPassword ? t("claim.subExisting") : t("claim.sub")}>
      <LanguageOffer claim={claim} />
      <Summary claim={claim} />
      <ClaimForm
        token={token}
        existing={claim.hasPassword}
        email={isPlaceholderEmail(claim.email) ? "" : claim.email}
      />
    </AuthShell>
  );
}
