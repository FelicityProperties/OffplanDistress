const aed = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });

export function formatAED(value: number | null | undefined) {
  if (value == null) return "—";
  return `AED ${aed.format(value)}`;
}

export function formatAEDCompact(value: number | null | undefined) {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1_000) return `AED ${Math.round(value / 1_000)}K`;
  return `AED ${value}`;
}

export function formatNumber(value: number) {
  return aed.format(value);
}

export function formatPct(value: number | null | undefined, digits = 0) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "2027-12-31" → "Q4 2027" */
export function formatQuarter(value: string | null | undefined) {
  if (!value) return "TBC";
  const d = new Date(value);
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

export function refCode(refNo: number) {
  return `OD-${1000 + refNo}`;
}

export function parseRefCode(code: string): number | null {
  const m = /^OD-(\d+)$/i.exec(code.trim());
  if (!m) return null;
  const n = Number(m[1]) - 1000;
  return n > 0 ? n : null;
}

export function timeAgo(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}
