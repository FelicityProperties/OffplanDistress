import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { ClaimForm } from "@/components/auth/ClaimForm";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser, isOwnerEmail } from "@/lib/auth";
import { type Claim, claimPath, findClaim, isPlaceholderEmail } from "@/lib/claim";
import { BRAND } from "@/lib/config";
import { formatAED, formatNumber, refCode } from "@/lib/format";
import { communityName } from "@/lib/place-names";

/** "m•••@gmail.com": enough for the seller to recognise their account, without spelling it out to anyone else. */
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain ?? ""}`;
}

/** What the seller is confirming: the listing as our team entered it. */
async function Summary({ claim }: { claim: Claim }) {
  const [t, tc, locale] = await Promise.all([getT("password"), getT("common"), getLocale()]);
  const rows: [string, React.ReactNode][] = [
    [t("claim.summary.ref"), <bdi key="ref">{refCode(claim.refNo)}</bdi>],
    [t("claim.summary.project"), <bdi key="project">{claim.projectName}</bdi>],
    [
      t("claim.summary.unit"),
      <span key="unit">
        {tc(`unit.${claim.unitType}`)} · {tc("sqft", { n: formatNumber(claim.sizeSqft) })} ·{" "}
        <bdi>{communityName(tc, claim.community, claim.communityOther)}</bdi>
      </span>,
    ],
    [t("claim.summary.asking"), formatAED(claim.askingPrice, locale)],
  ];
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
      <p className="mt-2 text-xs text-muted-foreground">{t("claim.summaryNote")}</p>
    </section>
  );
}

async function WhatsAppLink() {
  const [t, tm] = await Promise.all([getT("password"), getT("marketing")]);
  if (!BRAND.whatsapp) return null;
  return (
    <Button asChild variant="outline" className="w-full" size="lg">
      <a
        href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm("whatsapp.prefill.sell"))}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle aria-hidden /> {t("claim.contact")}
      </a>
    </Button>
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
      <Summary claim={claim} />
      <ClaimForm
        token={token}
        existing={claim.hasPassword}
        email={isPlaceholderEmail(claim.email) ? "" : claim.email}
      />
    </AuthShell>
  );
}
