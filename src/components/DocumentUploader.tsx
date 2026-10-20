"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FILE_KINDS, MAX_UPLOAD_BYTES } from "@/lib/config";

export async function uploadListingFile(listingId: string, file: File, kind: keyof typeof FILE_KINDS) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 4 MB.`);
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  const res = await fetch(`/api/listings/${listingId}/files`, { method: "POST", body });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
}

export function DocumentUploader({ listingId, kinds }: { listingId: string; kinds: (keyof typeof FILE_KINDS)[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<keyof typeof FILE_KINDS>(kinds[0]);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(list)) await uploadListingFile(listingId, f, kind);
      toast.success(list.length > 1 ? `${list.length} files uploaded` : "File uploaded");
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
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
        aria-label="Document type"
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {FILE_KINDS[k]}
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
        {busy ? <Loader2 className="animate-spin" /> : <FileUp />} Upload
      </Button>
      <span className="text-xs text-muted-foreground">PDF, JPG or PNG · up to 4 MB each</span>
    </div>
  );
}
