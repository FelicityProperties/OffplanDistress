"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSearch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";

export function DeleteSearchButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Delete saved search"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteSearch(id);
          toast.success("Search deleted");
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
