"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSearch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function DeleteSearchButton({ id }: { id: string }) {
  const t = useT("searches");
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={t("delete.label")}
      title={t("delete.label")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteSearch(id);
          if ("error" in res && res.error) toast.error(res.error);
          else toast.success(t("delete.done"));
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
