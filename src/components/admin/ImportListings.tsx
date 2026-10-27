"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, FileUp, Loader2, RotateCcw, Square } from "lucide-react";
import { adminImportListing, adminImportStatus, type ImportedUnit, type ImportResult } from "@/app/actions/import";
import { StatusPill } from "@/components/badges";
import { uploadListingFile } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale, useT } from "@/i18n/client";
import { formatAED, formatNumber, formatPct, refCode } from "@/lib/format";
import {
  checkListing,
  checkPhotos,
  checkUnitMeta,
  IMPORT_FORMAT,
  IMPORT_MAX_REFS,
  parseImportFile,
  photoStem,
  type ImportPhoto,
  type ImportSource,
  type UnitMeta,
} from "@/lib/import-format";
import type { ListingFields } from "@/lib/listing-schema";
import { communityName, developerName } from "@/lib/place-names";

// /admin/listings/import: the chosen files are read and checked here (the same rules as the server), shown as a
// preview, then imported one unit at a time — adminImportListing for the listing, then each photo through the upload
// route — so no request comes near the hosting platform's 4.5 MB limit. The server is the record of what is done:
// choosing the files again (after a reload, say) marks imported units as such and only adds their missing photos.

type Phase = "queued" | "working" | "photos" | "created" | "skipped" | "failed";

type Row = {
  /** source key + ref (or the file and position, for a unit too broken to have a ref). */
  key: string;
  source: ImportSource;
  meta: UnitMeta | null;
  /** The ref as written, for display even when invalid. */
  ref: string | null;
  listing: Record<string, unknown> | null;
  fields: ListingFields | null;
  photos: ImportPhoto[];
  invalid: string | null;
  /** Its listing, once imported (now or before), and the photos it has (as name stems). */
  listingId: string | null;
  refNo: number | null;
  uploaded: string[];
  /** Imported before this page was opened. */
  existed: boolean;
  phase: Phase | null;
  error: string | null;
  photoErrors: { name: string; error: string }[];
  photoProgress: { i: number; n: number } | null;
};

const STATUS_COL = "min-w-48 max-w-64 bg-card md:sticky md:end-0 md:z-10 md:border-s md:shadow-[-6px_0_8px_-8px_rgb(0_0_0/0.25)] rtl:md:shadow-[6px_0_8px_-8px_rgb(0_0_0/0.25)]";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const missingPhotos = (r: Row) => r.photos.filter((p) => !r.uploaded.includes(photoStem(p.filename)));
/** Still has work: no listing yet, or photos to add. */
const hasWork = (r: Row) => !r.invalid && (!r.listingId || missingPhotos(r).length > 0);

function photoFile(p: ImportPhoto) {
  const bin = atob(p.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], p.filename, { type: p.type });
}

export function ImportListings() {
  const ti = useT("intake");
  const te = useT("errors");
  const tc = useT("common");
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState<"reading" | "checking" | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const rowsRef = useRef<Row[]>([]);
  const stopRef = useRef(false);
  rowsRef.current = rows;

  // Leaving mid-import only stops it (the server keeps what is done), but warn anyway.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ti("import.leave");
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running, ti]);

  const patch = (key: string, p: Partial<Row>) => {
    rowsRef.current = rowsRef.current.map((r) => (r.key === key ? { ...r, ...p } : r));
    setRows(rowsRef.current);
  };
  const current = (key: string) => rowsRef.current.find((r) => r.key === key)!;

  async function onFiles(list: FileList | null) {
    if (!list?.length || running) return;
    const chosen = Array.from(list);
    if (input.current) input.current.value = "";
    setLoading("reading");
    setSummary(null);
    setFileErrors([]);
    setFileCount(chosen.length);
    const errors: string[] = [];
    const next: Row[] = [];
    const seen = new Set<string>();
    for (const f of chosen) {
      const parsed = parseImportFile(await f.text(), ti);
      if (!parsed.ok) {
        errors.push(ti("import.fileError", { name: f.name, error: parsed.error }));
        continue;
      }
      const { source, units } = parsed.file;
      units.forEach((u, i) => {
        const meta = checkUnitMeta(u, ti);
        const unit = isObject(u) ? u : {};
        const ref = typeof unit.ref === "string" ? unit.ref : null;
        const key = meta.ok ? `${source.key}|${meta.meta.ref}` : `${f.name}#${i}`;
        const listing = isObject(unit.listing) ? unit.listing : null;
        const fields = checkListing(unit.listing, ti, te);
        const photos = checkPhotos(unit.photos, ti);
        // The same unit twice in the chosen files: the first one counts.
        const duplicate = meta.ok && seen.has(key);
        if (meta.ok) seen.add(key);
        const invalid = !meta.ok
          ? meta.error
          : duplicate
            ? ti("status.duplicate")
            : !fields.ok
              ? fields.error
              : !photos.ok
                ? photos.error
                : null;
        next.push({
          key: duplicate ? `${key}#${f.name}#${i}` : key,
          source,
          meta: meta.ok ? meta.meta : null,
          ref,
          listing,
          fields: fields.ok ? fields.data : null,
          photos: photos.ok ? photos.photos : [],
          invalid,
          listingId: null,
          refNo: null,
          uploaded: [],
          existed: false,
          phase: null,
          error: null,
          photoErrors: [],
          photoProgress: null,
        });
      });
    }
    setFileErrors(errors);
    // Which of these units are already imported (one check per source, a few thousand refs at a time).
    setLoading("checking");
    const bySource = new Map<string, string[]>();
    for (const r of next) if (r.meta && !r.invalid) bySource.set(r.source.key, [...(bySource.get(r.source.key) ?? []), r.meta.ref]);
    const done = new Map<string, ImportedUnit>();
    try {
      for (const [key, refs] of bySource) {
        for (let i = 0; i < refs.length; i += IMPORT_MAX_REFS) {
          const res = await adminImportStatus(key, refs.slice(i, i + IMPORT_MAX_REFS));
          if ("error" in res) throw new Error(res.error);
          for (const [ref, unit] of Object.entries(res.imported)) done.set(`${key}|${ref}`, unit);
        }
      }
    } catch (e) {
      setLoading(null);
      setRows([]);
      setFileErrors([...errors, e instanceof Error && e.message ? e.message : ti("error.status")]);
      return;
    }
    const withStatus = next.map((r) => {
      const d = r.invalid ? undefined : done.get(r.key);
      return d ? { ...r, listingId: d.listingId, refNo: d.refNo, uploaded: d.photos.map(photoStem), existed: true } : r;
    });
    rowsRef.current = withStatus;
    setRows(withStatus);
    setLoading(null);
  }

  /** One unit: its listing (unless it has one), then each photo it doesn't have yet. */
  async function processRow(key: string) {
    const r = current(key);
    patch(key, { phase: "working", error: null, photoErrors: [], photoProgress: null });
    let listingId = r.listingId;
    let outcome: Phase = r.listingId ? "skipped" : "created";
    if (!listingId) {
      const unit = { ref: r.meta!.ref, url: r.meta!.url, posted: r.meta!.posted, notes: r.meta!.notes, listing: r.listing };
      const res: ImportResult = await adminImportListing(r.source, unit).catch(() => ({ error: ti("error.failed") }));
      if (!res.ok) {
        patch(key, { phase: "failed", error: res.error });
        return "failed" as const;
      }
      listingId = res.listingId;
      outcome = res.created ? "created" : "skipped";
      let uploaded = current(key).uploaded;
      // Imported meanwhile (another tab): find out which photos it already has.
      if (!res.created) {
        const status = await adminImportStatus(r.source.key, [r.meta!.ref]).catch(() => null);
        const known = status && "imported" in status ? status.imported[r.meta!.ref] : undefined;
        uploaded = known ? known.photos.map(photoStem) : uploaded;
      }
      patch(key, { listingId, refNo: res.refNo, uploaded });
    }
    const todo = missingPhotos(current(key));
    const photoErrors: Row["photoErrors"] = [];
    for (const [i, p] of todo.entries()) {
      patch(key, { phase: "photos", photoProgress: { i: i + 1, n: todo.length } });
      try {
        await uploadListingFile(listingId, photoFile(p), "photo", locale);
        patch(key, { uploaded: [...current(key).uploaded, photoStem(p.filename)] });
      } catch (e) {
        photoErrors.push({ name: p.filename, error: e instanceof Error && e.message ? e.message : ti("error.uploadFailed") });
      }
    }
    patch(key, { phase: outcome, photoErrors, photoProgress: null });
    return outcome;
  }

  async function run(keys: string[]) {
    if (!keys.length || running) return;
    stopRef.current = false;
    setRunning(true);
    setSummary(null);
    for (const k of keys) patch(k, { phase: "queued" });
    const tally = { created: 0, skipped: 0, failed: 0 };
    let i = 0;
    for (const k of keys) {
      if (stopRef.current) break;
      setProgress({ i: i + 1, n: keys.length });
      const outcome = await processRow(k);
      i++;
      if (outcome === "failed") tally.failed++;
      else if (outcome === "created") tally.created++;
      else tally.skipped++;
    }
    // Rows the stop left waiting go back to how they were.
    for (const k of keys) if (current(k).phase === "queued") patch(k, { phase: null });
    setRunning(false);
    setProgress(null);
    setSummary(
      stopRef.current && i < keys.length ? ti("import.stopped", { done: i, n: keys.length }) : ti("import.done", tally),
    );
  }

  const valid = rows.filter((r) => !r.invalid);
  const counts = {
    units: rows.length,
    new: valid.filter((r) => !r.existed).length,
    done: valid.filter((r) => r.existed).length,
    invalid: rows.length - valid.length,
  };
  // What "Import" does next; failed rows and photos are retried with their own button.
  const pendingRows = rows.filter((r) => hasWork(r) && r.phase !== "failed" && r.photoErrors.length === 0);
  const newCount = pendingRows.filter((r) => !r.listingId).length;
  const photoCount = pendingRows.reduce((n, r) => n + (r.listingId ? missingPhotos(r).length : 0), 0);
  const retryRows = rows.filter((r) => !r.invalid && (r.phase === "failed" || r.photoErrors.length > 0));
  const startLabel =
    newCount > 0
      ? newCount === 1
        ? ti("import.startOne")
        : ti("import.start", { n: newCount })
      : photoCount === 1
        ? ti("import.photosOnlyOne")
        : ti("import.photosOnly", { n: photoCount });
  const pct = progress ? Math.round(((progress.i - 1) / progress.n) * 100) : 0;
  const busy = running || loading != null;

  const status = (r: Row) => {
    if (r.invalid) {
      return (
        <div className="space-y-1">
          <StatusPill tone="destructive">{ti("status.invalid")}</StatusPill>
          <p className="text-xs text-destructive">{r.invalid}</p>
        </div>
      );
    }
    const open = r.listingId && r.refNo != null && (
      <Link href={`/admin/listings/${r.listingId}`} className="text-xs font-medium underline underline-offset-4 hover:no-underline">
        {ti("row.open", { ref: refCode(r.refNo) })}
      </Link>
    );
    const missing = missingPhotos(r).length;
    const photosLine =
      r.photos.length > 0 && (r.phase === "created" || r.phase === "skipped") ? (
        <p className="text-xs text-muted-foreground">{ti("status.photosDone", { done: r.photos.length - missing, n: r.photos.length })}</p>
      ) : null;
    const photoErrors = r.photoErrors.length > 0 && (
      <div className="space-y-1">
        <p className="text-xs text-destructive">{ti("status.photosFailed", { n: r.photoErrors.length })}</p>
        <ul className="list-disc ps-4 text-xs text-destructive">
          {r.photoErrors.map((e) => (
            <li key={e.name}>{e.error.includes(e.name) ? e.error : `${e.name}: ${e.error}`}</li>
          ))}
        </ul>
        {!running && (
          <Button size="sm" variant="outline" onClick={() => run([r.key])}>
            <RotateCcw aria-hidden /> {ti("row.retryPhotos")}
          </Button>
        )}
      </div>
    );
    switch (r.phase) {
      case "queued":
        return <StatusPill>{ti("status.queued")}</StatusPill>;
      case "working":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {ti("status.working")}
          </span>
        );
      case "photos":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {ti("status.photos", r.photoProgress ?? { i: 0, n: 0 })}
          </span>
        );
      case "failed":
        return (
          <div className="space-y-1">
            <StatusPill tone="destructive">{ti("status.failed")}</StatusPill>
            <p className="text-xs text-destructive">{r.error}</p>
            {!running && (
              <Button size="sm" variant="outline" onClick={() => run([r.key])}>
                <RotateCcw aria-hidden /> {ti("row.retry")}
              </Button>
            )}
          </div>
        );
      case "created":
      case "skipped":
        return (
          <div className="space-y-1">
            <StatusPill tone={r.phase === "created" ? "success" : "muted"}>
              {ti(r.phase === "created" ? "status.created" : "status.skipped")}
            </StatusPill>
            <div>{open}</div>
            {photosLine}
            {photoErrors}
          </div>
        );
      default:
        return (
          <div className="space-y-1">
            <StatusPill tone={r.existed ? "muted" : "gold"}>{ti(r.existed ? "status.done" : "status.new")}</StatusPill>
            {open && <div>{open}</div>}
            {r.existed && missing > 0 && <p className="text-xs text-muted-foreground">{ti("status.photosMissing", { n: missing })}</p>}
          </div>
        );
    }
  };

  const money = (v: number | undefined) => (v == null ? "—" : formatAED(v, locale));

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            id="import-files"
            type="file"
            multiple
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
            disabled={busy}
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />} {ti("import.choose")}
          </Button>
          <span className="min-w-0 text-xs text-muted-foreground wrap-anywhere" aria-live="polite">
            {loading === "reading"
              ? ti("import.reading")
              : loading === "checking"
                ? ti("import.checking")
                : ti("import.chooseHint", { format: IMPORT_FORMAT })}
          </span>
        </div>
        {fileErrors.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <ul className="min-w-0 space-y-0.5 wrap-anywhere">
              {fileErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {rows.length > 0 && (
          <>
            <dl className="flex flex-wrap gap-2 text-sm" data-testid="import-summary">
              {(
                [
                  ["units", counts.units],
                  ["files", fileCount],
                  ["new", counts.new],
                  ["done", counts.done],
                  ["invalid", counts.invalid],
                ] as const
              ).map(([k, n]) => (
                <div key={k} className="flex items-baseline gap-1.5 rounded-lg bg-secondary px-3 py-1.5" data-count={k}>
                  <dt className="text-muted-foreground">{ti(`import.sum.${k}`)}</dt>
                  <dd className="font-semibold tabular">{formatNumber(n)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              {newCount + photoCount > 0 ? (
                <Button disabled={busy} onClick={() => run(pendingRows.map((r) => r.key))} data-testid="import-start">
                  {running ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />} {startLabel}
                </Button>
              ) : (
                !running && retryRows.length === 0 && <p className="text-sm text-muted-foreground">{ti("import.nothing")}</p>
              )}
              {running && (
                <Button variant="outline" onClick={() => (stopRef.current = true)}>
                  <Square aria-hidden /> {ti("import.stop")}
                </Button>
              )}
              {!running && retryRows.length > 0 && (
                <Button variant="outline" onClick={() => run(retryRows.map((r) => r.key))}>
                  <RotateCcw aria-hidden /> {ti("import.retryFailed", { n: retryRows.length })}
                </Button>
              )}
            </div>
            {progress && (
              <div className="space-y-1" aria-live="polite">
                <p className="text-sm font-medium" data-testid="import-progress">
                  {ti("import.running", progress)}
                </p>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.n}
                  aria-valuenow={progress.i - 1}
                  aria-label={ti("import.running", progress)}
                  className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            {summary && (
              <p role="status" className="text-sm font-medium" data-testid="import-result">
                {summary}
              </p>
            )}
          </>
        )}
      </section>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table className="min-w-[1000px]" aria-label={ti("table.label")}>
            <TableHeader>
              <TableRow>
                <TableHead>{ti("col.ref")}</TableHead>
                <TableHead>{ti("col.project")}</TableHead>
                <TableHead>{ti("col.type")}</TableHead>
                <TableHead className="text-end">{ti("col.size")}</TableHead>
                <TableHead className="text-end">{ti("col.spa")}</TableHead>
                <TableHead className="text-end">{ti("col.paid")}</TableHead>
                <TableHead className="text-end">{ti("col.toSeller")}</TableHead>
                <TableHead className="text-end">{ti("col.saleValue")}</TableHead>
                <TableHead className="text-end">{ti("col.plan")}</TableHead>
                <TableHead className="text-end">{ti("col.photos")}</TableHead>
                {/* Pinned to the end from tablet width up: the figures scroll under it, the status stays in view. */}
                <TableHead className={STATUS_COL}>{ti("col.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const f = r.fields;
                const project = f?.projectName ?? (typeof r.listing?.projectName === "string" ? r.listing.projectName : null);
                const remaining = f ? Math.max(f.originalPrice - f.amountPaid, 0) : null;
                const url = r.meta?.url;
                return (
                  <TableRow key={r.key} data-ref={r.ref ?? ""} data-key={r.key} className="align-top">
                    <TableCell className="whitespace-nowrap">
                      {r.ref ? (
                        url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                            title={ti("row.source", { source: r.source.name })}
                          >
                            <bdi dir="ltr">{r.ref}</bdi>
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          <bdi dir="ltr" className="font-medium">
                            {r.ref}
                          </bdi>
                        )
                      ) : (
                        "—"
                      )}
                      <p className="text-xs text-muted-foreground">
                        <bdi>{r.source.name}</bdi>
                      </p>
                    </TableCell>
                    <TableCell className="min-w-48 wrap-anywhere">
                      <p className="font-medium">
                        <bdi>{project ?? "—"}</bdi>
                      </p>
                      {f && (
                        <p className="text-xs text-muted-foreground">
                          <bdi>{developerName(tc, f.developer, f.developerOther)}</bdi> ·{" "}
                          <bdi>{communityName(tc, f.community, f.communityOther)}</bdi>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{f ? tc(`unit.${f.unitType}`) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-end tabular">{f ? tc("sqft", { n: formatNumber(f.sizeSqft) }) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-end tabular">{money(f?.originalPrice)}</TableCell>
                    <TableCell className="whitespace-nowrap text-end tabular">
                      {money(f?.amountPaid)}
                      {f && (
                        <p className="text-xs text-muted-foreground">
                          {ti("table.paidPct", { pct: formatPct(f.originalPrice ? f.amountPaid / f.originalPrice : null) })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-end tabular">{money(f?.askingPrice)}</TableCell>
                    <TableCell className="whitespace-nowrap text-end tabular">{f && remaining != null ? money(f.askingPrice + remaining) : "—"}</TableCell>
                    <TableCell className="text-end tabular">{f ? f.paymentPlan.length : "—"}</TableCell>
                    <TableCell className="text-end tabular">{r.photos.length}</TableCell>
                    <TableCell data-testid="import-status" className={STATUS_COL}>
                      {status(r)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
