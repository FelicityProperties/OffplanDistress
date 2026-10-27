/**
 * Free text from a form or a link, without the control characters nobody types on purpose. Postgres can't store a NUL
 * byte (U+0000) in text at all, so one left in would turn the save or search into a server error.
 * A one-line field (a name, a search) turns tabs and line breaks into spaces; a multi-line one (a message) keeps them.
 */
export function cleanText(value: string, { multiline = false } = {}) {
  const spaced = multiline ? value : value.replace(/[\t\n\v\f\r]/g, " ");
  return spaced.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

/** cleanText for a FormData value; anything that isn't text (a file, nothing) is passed through for the schema to judge. */
export function formText<V>(value: V, opts?: { multiline?: boolean }) {
  return typeof value === "string" ? cleanText(value, opts) : value;
}
