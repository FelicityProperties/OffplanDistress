"use client";

import { useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { useT } from "@/i18n/client";
import { installServerSnapshot, installSnapshot, openInstallCard, promptInstall, subscribeInstall } from "@/lib/install-prompt";

/**
 * "Install the app" in the header's menu sheet (src/components/SiteHeader.tsx), wherever the browser can install the
 * site: Chrome's install dialog at once, or in iOS Safari the install card with its steps (InstallPrompt.tsx). Absent in
 * the installed app and in browsers that can't install it. Closes the menu.
 */
export function InstallMenuItem() {
  const t = useT("app");
  const { platform, standalone } = useSyncExternalStore(subscribeInstall, installSnapshot, installServerSnapshot);
  if (!platform || standalone) return null;
  return (
    <SheetClose asChild>
      <Button
        variant="outline"
        className="h-11 justify-start gap-2"
        onClick={() => {
          // Chrome's dialog needs this very click.
          if (platform === "android") void promptInstall();
          else openInstallCard();
        }}
      >
        <Smartphone aria-hidden />
        {t("install.menu")}
      </Button>
    </SheetClose>
  );
}
