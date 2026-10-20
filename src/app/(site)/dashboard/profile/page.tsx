import { PageTitle } from "@/components/Kpi";
import { ProfileForm, RequestKycButton } from "@/components/ProfileForm";
import { StatusPill } from "@/components/badges";
import { requireUser } from "@/lib/auth";

const KYC = {
  not_started: { label: "Not started", tone: "muted" as const },
  pending: { label: "In review", tone: "warning" as const },
  verified: { label: "Verified", tone: "success" as const },
};

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const kyc = KYC[user.kycStatus];

  return (
    <div className="space-y-6">
      <PageTitle title="Profile & KYC" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <p className="mb-4 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <ProfileForm fullName={user.fullName} phone={user.phone} intent={user.intent} />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="font-semibold">KYC status</p>
            <StatusPill tone={kyc.tone}>{kyc.label}</StatusPill>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            UAE law requires us to verify the identity of buyers and sellers before a transfer. Verified buyers&apos;
            offers are shown to sellers with a “KYC verified” tag, which makes them more likely to be accepted.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• Passport and Emirates ID (or visa page for non-residents)</li>
            <li>• Proof of funds for the upfront amount (buyers)</li>
            <li>• SPA and statement of account (sellers — upload on your listing)</li>
          </ul>
          <div className="mt-6">
            <RequestKycButton disabled={user.kycStatus !== "not_started"} />
          </div>
        </div>
      </div>
    </div>
  );
}
