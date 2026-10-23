"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden bg-background px-4 py-20">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning-soft text-warning ring-1 ring-warning/20">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">{t("errorTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("errorBody")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()} className="rounded-full">
            {t("tryAgain")}
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            {/* a full page load, in case the error came from client state */}
            <a href="/">{t("goHome")}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
