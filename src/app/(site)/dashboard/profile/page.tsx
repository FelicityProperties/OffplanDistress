import type { Metadata } from "next";
import { PageTitle } from "@/components/Kpi";
import { ProfileForm, RequestKycButton } from "@/components/ProfileForm";
import { StatusPill } from "@/components/badges";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

const KYC_TONE = {
  not_started: "muted",
  pending: "warning",
  verified: "success",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("profile.title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const [t, tc] = await Promise.all([getT("dashboard"), getT("common")]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("profile.title")} />
      {/* grid-cols-1 (minmax(0, 1fr)): an auto track grew with a long e-mail address, past the screen on a phone. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card max-sm:p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {t("profile.signedInAs")}{" "}
            {/* An address is one long word: it breaks anywhere rather than run out of the card. */}
            <bdi className="font-medium text-foreground wrap-anywhere">{user.email}</bdi>
          </p>
          <ProfileForm fullName={user.fullName} phone={user.phone} intent={user.intent} />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card max-sm:p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{t("profile.kycStatus")}</p>
            <StatusPill tone={KYC_TONE[user.kycStatus]}>{tc(`kyc.${user.kycStatus}`)}</StatusPill>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("profile.kycBody")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• {t("profile.kycDocId")}</li>
            <li>• {t("profile.kycDocFunds")}</li>
            <li>• {t("profile.kycDocSpa")}</li>
          </ul>
          <div className="mt-6">
            <RequestKycButton disabled={user.kycStatus !== "not_started"} />
          </div>
        </div>
      </div>
    </div>
  );
}
