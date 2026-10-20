"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { translator } from "@/i18n/translator";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";

/** Uploads one listing file. Errors carry a message in `locale` (the route answers in the request's language). */
export async function uploadListingFile(listingId: string, file: File, kind: keyof typeof FILE_KINDS, locale: Locale = "en") {
  const t = translator("sell", locale);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(t("upload.tooLarge", { name: file.name }));
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  let res: Response;
  try {
    res = await fetch(`/api/listings/${listingId}/files`, { method: "POST", body });
  } catch {
    // Network failure: the browser's TypeError message is English-only.
    throw new Error(t("uploader.failed"));
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? t("uploader.failedStatus", { status: res.status }));
  }
}

export function DocumentUploader({ listingId, kinds }: { listingId: string; kinds: (keyof typeof FILE_KINDS)[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT("sell");
  const tc = useT("common");
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<keyof typeof FILE_KINDS>(kinds[0]);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(list)) await uploadListingFile(listingId, f, kind, locale);
      toast.success(list.length > 1 ? t("uploader.uploadedMany", { n: list.length }) : t("uploader.uploaded"));
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploader.failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as keyof typeof FILE_KINDS)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        aria-label={t("uploader.kind")}
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {tc(`file.${k}`)}
          </option>
        ))}
      </select>
      <input
        ref={input}
        type="file"
        multiple
        accept={kind === "photo" ? "image/*" : "application/pdf,image/*"}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <FileUp />} {t("uploader.button")}
      </Button>
      <span className="text-xs text-muted-foreground">{t("uploader.hint")}</span>
    </div>
  );
}
