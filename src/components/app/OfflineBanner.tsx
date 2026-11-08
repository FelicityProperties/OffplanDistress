"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wifi, WifiOff } from "lucide-react";
import { belowHeader, useShell } from "@/components/ui/sonner";
import { useT } from "@/i18n/client";

/** How long "Back online" stays. */
const BACK_FOR = 2000;

/**
 * "You're offline" under the header while the device has no connection, then "Back online" for two seconds. The page
 * on screen keeps working; a page that can't load shows /offline.html (public/sw.js). Online on the server and at the
 * first render, so it is never in the HTML. The live region itself is always there, empty, so that screen readers
 * announce the change; it never takes a tap.
 */
export function OfflineBanner() {
  const t = useT("app");
  const pathname = usePathname();
  const shell = useShell();
  const [state, setState] = useState<"online" | "offline" | "back">("online");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offline = () => {
      clearTimeout(timer);
      setState("offline");
    };
    const online = () => {
      clearTimeout(timer);
      setState((s) => (s === "offline" ? "back" : "online"));
      timer = setTimeout(() => setState("online"), BACK_FOR);
    };
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 print:hidden"
      style={{ top: belowHeader(pathname, shell) }}
    >
      {state !== "online" && (
        <p className="flex max-w-md items-center gap-2 rounded-3xl bg-ink px-4 py-2 text-sm font-medium text-primary-foreground shadow-lift animate-in fade-in slide-in-from-top-2 duration-200">
          {state === "offline" ? <WifiOff className="h-4 w-4 shrink-0" aria-hidden /> : <Wifi className="h-4 w-4 shrink-0" aria-hidden />}
          {state === "offline" ? t("offline.banner") : t("offline.back")}
        </p>
      )}
    </div>
  );
}
