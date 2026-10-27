/**
 * One CSV cell. Text a spreadsheet would run as a formula (starting with = + - @, a tab or a carriage return) gets a
 * leading apostrophe, so it is shown as typed and never evaluated; cells with a comma, a quote, a line break or edge
 * spaces are quoted. Numbers go out as they are.
 */
export function csvCell(value: string | number | null | undefined) {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows as CSV for Excel: a UTF-8 byte order mark (so Arabic opens correctly), CRLF line ends. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
