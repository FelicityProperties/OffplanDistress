"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileUp, Loader2, X } from "lucide-react";
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

type Decoded = CanvasImageSource & { width: number; height: number };

/**
 * The photo's upright size without decoding its pixels: an <img> reads it from the file's header (and applies the
 * EXIF rotation, as browsers do by default). Null when this browser can't open the file.
 */
function naturalSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (size: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onload = () => done(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => done(null);
    img.src = url;
  });
}

let resizeSupported: boolean | undefined;
/** Whether createImageBitmap takes resizeWidth / resizeHeight: a browser that knows the option reads it from the bag. */
function canResizeOnDecode() {
  if (resizeSupported !== undefined) return resizeSupported;
  resizeSupported = false;
  if (typeof createImageBitmap !== "function" || typeof ImageData === "undefined") return false;
  try {
    const probe = {
      get resizeWidth() {
        resizeSupported = true;
        return 1;
      },
    } as ImageBitmapOptions;
    createImageBitmap(new ImageData(1, 1), probe).then((b) => b.close(), () => {});
  } catch {}
  return resizeSupported;
}

/**
 * Decodes a photo upright. A photo bigger than we store is decoded straight at the stored size (long edge 2000 px): a
 * 48-megapixel phone shot decoded at full size takes about 200 MB, more than a phone browser tab may be given. Browsers
 * without createImageBitmap's resize options (or that refuse the file that way) decode it at full size as before.
 */
async function decode(file: File): Promise<Decoded> {
  const size = canResizeOnDecode() ? await naturalSize(file) : null;
  if (size && Math.max(size.width, size.height) > PHOTO_MAX_EDGE) {
    const scale = PHOTO_MAX_EDGE / Math.max(size.width, size.height);
    // Only the long edge is given: the browser keeps the proportions, whether it applies the EXIF rotation before or
    // after resizing. Should it land on the other edge, the canvas below still shrinks the result to 2000 px.
    const edge: ImageBitmapOptions =
      size.width >= size.height ? { resizeWidth: Math.round(size.width * scale) } : { resizeHeight: Math.round(size.height * scale) };
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image", resizeQuality: "high", ...edge });
    } catch {
      // Decoded at full size below.
    }
  }
  return decodeFull(file);
}

async function decodeFull(file: File): Promise<Decoded> {
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
  let source: Decoded;
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

type Failure = { name: string; error: string };

export function DocumentUploader({ listingId, kinds }: { listingId: string; kinds: (keyof typeof FILE_KINDS)[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT("sell");
  const tc = useT("common");
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<keyof typeof FILE_KINDS>(kinds[0]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  // Files from the last pick that didn't make it, with why; shown until the next pick or dismissed.
  const [failed, setFailed] = useState<Failure[]>([]);
  const [, startTransition] = useTransition();

  /** One file at a time (phones have little memory for photos); a file that fails doesn't stop the others. */
  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    if (input.current) input.current.value = "";
    setBusy(true);
    setFailed([]);
    const errors: Failure[] = [];
    let uploaded = 0;
    for (const [i, f] of files.entries()) {
      setProgress({ i: i + 1, n: files.length });
      try {
        // Documents are checked before anything is sent (photos are resized, so their size doesn't matter).
        if (kind !== "photo" && f.size > MAX_UPLOAD_BYTES) throw new Error(t("error.docTooLarge", { name: f.name }));
        await uploadListingFile(listingId, f, kind, locale);
        uploaded++;
      } catch (e) {
        errors.push({ name: f.name, error: e instanceof Error && e.message ? e.message : t("uploader.failed") });
      }
    }
    setBusy(false);
    setProgress(null);
    setFailed(errors);
    if (uploaded) {
      toast.success(
        errors.length
          ? t("uploader.uploadedSome", { done: uploaded, n: files.length })
          : uploaded > 1
            ? t("uploader.uploadedMany", { n: uploaded })
            : t("uploader.uploaded"),
      );
      // The document list and photos on the page include what did upload.
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="min-w-0 space-y-2">
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
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {progress && progress.n > 1 ? t("uploader.progress", progress) : t(kind === "photo" ? "uploader.photoHint" : "uploader.hint")}
        </span>
      </div>
      {failed.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:max-w-md">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {/* wrap-anywhere: file names are often one long word. */}
          <div className="min-w-0 flex-1 wrap-anywhere">
            <p className="font-medium">{t("uploader.failedList")}</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              {failed.map((f, i) => (
                <li key={i}>
                  {/* Most messages already name the file; the others get its name in front. */}
                  {f.error.includes(f.name) ? f.error : t("uploader.fileError", { name: f.name, error: f.error })}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setFailed([])}
            aria-label={t("uploader.dismiss")}
            className="-me-1 grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
