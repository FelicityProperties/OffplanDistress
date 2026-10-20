import { BadgeCheck, FileCheck2, FileSignature, Handshake, KeyRound, Search, Upload } from "lucide-react";
import { getT } from "@/i18n/server";
import { BUYER_STEPS, SELLER_STEPS } from "@/lib/content";

const ICONS = {
  upload: Upload,
  badge: BadgeCheck,
  handshake: Handshake,
  key: KeyRound,
  search: Search,
  file: FileCheck2,
  sign: FileSignature,
};

type Step = (typeof SELLER_STEPS)[number] | (typeof BUYER_STEPS)[number];

export async function StepsCard({ title, steps }: { title: string; steps: readonly Step[] }) {
  const t = await getT("home");
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <ol className="mt-6 space-y-5">
        {steps.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <li key={s.id} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">
                  <span className="text-muted-foreground tabular">0{i + 1}</span> · {t(`step.${s.id}.title`)}
                </p>
                <p className="text-sm text-muted-foreground">{t(`step.${s.id}.desc`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
