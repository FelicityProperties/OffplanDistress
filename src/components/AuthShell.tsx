import type { ReactNode } from "react";
import { BadgeCheck, FileSignature, Wallet } from "lucide-react";
import { getT } from "@/i18n/server";
import { AUTH_IMAGE } from "@/lib/content";

export async function AuthShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const t = await getT("auth");
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-ink lg:block">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${AUTH_IMAGE})` }} />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="absolute bottom-10 start-10 max-w-sm space-y-4 text-primary-foreground">
          <p className="font-display text-2xl">{t("shell.headline")}</p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-gold" /> {t("shell.point.verified")}
            </li>
            <li className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 shrink-0 text-gold" /> {t("shell.point.noc")}
            </li>
            <li className="flex items-center gap-2">
              <Wallet className="h-4 w-4 shrink-0 text-gold" /> {t("shell.point.fee")}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
