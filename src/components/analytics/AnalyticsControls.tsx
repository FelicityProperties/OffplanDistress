"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { NO_TRACK_KEY } from "./PageViewTracker";

/**
 * The chart's table twin: always in the page for screen readers, shown on screen with the button (the chart itself is
 * hidden from assistive technology, so nothing is read twice).
 */
export function TableToggle({ children }: { children: React.ReactNode }) {
  const t = useT("analytics");
  const [shown, setShown] = useState(false);
  return (
    <div>
      <Button type="button" size="sm" variant="outline" aria-pressed={shown} onClick={() => setShown((v) => !v)}>
        <Table2 aria-hidden /> {t(shown ? "chart.table.hide" : "chart.table.show")}
      </Button>
      <div className={cn(shown ? "mt-4 overflow-x-auto" : "sr-only")}>{children}</div>
    </div>
  );
}

/** Re-reads the page's numbers without leaving it. */
export function RefreshButton() {
  const t = useT("analytics");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} {t("live.refresh")}
    </Button>
  );
}

// localStorage od_no_track = "1" makes PageViewTracker skip this browser (useful when signed out on a staff device).
type DeviceState = "ignored" | "counted" | "blocked" | "unknown";
const CHANGED = "od-no-track-change";

function readDevice(): DeviceState {
  try {
    return localStorage.getItem(NO_TRACK_KEY) === "1" ? "ignored" : "counted";
  } catch {
    return "blocked";
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** "Ignore this device" / "Count this device again", with the current state. */
export function DeviceToggle() {
  const t = useT("analytics");
  const state = useSyncExternalStore<DeviceState>(subscribe, readDevice, () => "unknown");
  const set = (ignore: boolean) => {
    try {
      if (ignore) localStorage.setItem(NO_TRACK_KEY, "1");
      else localStorage.removeItem(NO_TRACK_KEY);
      window.dispatchEvent(new Event(CHANGED));
      toast.success(t(ignore ? "thisDevice.ignoredToast" : "thisDevice.countedToast"));
    } catch {
      window.dispatchEvent(new Event(CHANGED));
    }
  };
  const ignored = state === "ignored";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="flex min-w-0 flex-1 basis-60 items-start gap-2 text-sm font-medium" data-device-state={state}>
        {ignored ? (
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        ) : (
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span>
          {state === "unknown"
            ? t("thisDevice.checking")
            : state === "blocked"
              ? t("thisDevice.blocked")
              : t(ignored ? "thisDevice.ignored" : "thisDevice.counted")}
        </span>
      </p>
      {(state === "ignored" || state === "counted") && (
        <Button type="button" size="sm" variant={ignored ? "outline" : "default"} onClick={() => set(!ignored)}>
          {ignored ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
          {t(ignored ? "thisDevice.count" : "thisDevice.ignore")}
        </Button>
      )}
    </div>
  );
}
