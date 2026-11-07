"use client";

import { useId, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleSearchAlerts } from "@/app/actions/alerts";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";

/** Email + in-app alert switch for one saved search. Flips instantly; reverts if the save fails. */
export function AlertToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const t = useT("searches");
  const switchId = useId();
  const [checked, setChecked] = useOptimistic(enabled);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2 max-lg:gap-3">
      <Switch
        id={switchId}
        checked={checked}
        disabled={pending}
        // The thumb slides with translate-x-4, which points the wrong way in RTL: mirror it there.
        className="rtl:[&>span]:data-[state=checked]:-translate-x-4"
        onCheckedChange={(next) =>
          start(async () => {
            setChecked(next);
            const res = await toggleSearchAlerts(id, next);
            if (res.error) toast.error(res.error);
            else toast.success(next ? t("alerts.on") : t("alerts.off"));
          })
        }
      />
      {/* Below lg the label is a 44 px row, so a tap beside the small switch still flips it. */}
      <Label
        htmlFor={switchId}
        className="cursor-pointer text-sm font-normal text-muted-foreground max-lg:flex max-lg:min-h-11 max-lg:items-center max-lg:pe-2"
      >
        {t("alerts.label")}
      </Label>
    </div>
  );
}
