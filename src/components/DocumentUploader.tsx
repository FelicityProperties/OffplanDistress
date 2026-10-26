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

/** Listing photos are stored at most this many pixels on the long edge (plenty for the gallery, under 1 MB). */
const PHOTO_MAX_EDGE = 2000;
const PHOTO_QUALITY = 0.82;
/** Photos already shrunk by preparePhoto (the sell form does it when they're picked), so they aren't encoded twice. */
const prepared = new WeakSet<File>();

/** HEIC / HEIF, the iPhone camera default: only Safari can decode it. */
export function isHeic(file: File) {
  return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    // Turns the photo upright per its EXIF orientation.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: an <img> decodes what the browser can show (HEIC included, on Apple devices).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Shrinks a photo in the browser before upload: at most 2000 px on the long edge, re-encoded as JPEG. A 10 MB phone
 * photo comes out well under 1 MB, HEIC becomes a format every browser shows, and the EXIF data (including the
 * location) is dropped. Throws a message in `locale` when this browser can't decode the file (HEIC outside Safari).
 */
export async function preparePhoto(file: File, locale: Locale = "en"): Promise<File> {
  if (prepared.has(file)) return file;
  const t = translator("sell", locale);
  const fail = () => new Error(t(isHeic(file) ? "photo.heic" : "photo.unreadable", { name: file.name }));
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    throw fail();
  }
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx || !source.width) throw fail();
  // JPEG has no transparency: put transparent PNG / WebP areas on white rather than black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY));
  if (!blob) throw fail();
  const out = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
  prepared.add(out);
  return out;
}

/** Uploads one listing file. Errors carry a message in `locale` (the route answers in the request's language). */
export async function uploadListingFile(listingId: string, file: File, kind: keyof typeof FILE_KINDS, locale: Locale = "en") {
  const t = translator("sell", locale);
  if (kind === "photo") file = await preparePhoto(file, locale);
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
    // Documents are checked before anything is sent (photos are resized, so their size doesn't matter).
    const tooBig = kind === "photo" ? undefined : Array.from(list).find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      toast.error(t("error.docTooLarge", { name: tooBig.name }));
      if (input.current) input.current.value = "";
      return;
    }
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
      <span className="text-xs text-muted-foreground">{t(kind === "photo" ? "uploader.photoHint" : "uploader.hint")}</span>
    </div>
  );
}
