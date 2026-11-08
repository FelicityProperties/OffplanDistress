// Phone ergonomics shared by the sell form and the free estimate (./SellForm.tsx, ./QuickEstimate.tsx): showing the
// first field to fix after a step fails its checks, and the keyboard's Next key.

const TEXT_TYPES = new Set(["text", "search", "tel", "url", "email", "password", "number"]);

/** Fields typed into, in the form's order: not hidden, file, date or choice inputs, nor the honeypot (aria-hidden). */
function textFields(form: HTMLFormElement) {
  return [...form.elements].filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement =>
      ((el instanceof HTMLInputElement && TEXT_TYPES.has(el.type)) || el instanceof HTMLTextAreaElement) &&
      el.tabIndex >= 0 &&
      !el.disabled &&
      !el.readOnly &&
      !el.closest('[aria-hidden="true"]'),
  );
}

/**
 * After a step fails its checks: the first field with an error (aria-invalid, in page order) is scrolled to the middle
 * of the screen and focused, so a phone shows what to fix (it may be above the screen or under the sticky header) and a
 * screen reader reads it with its error. A message with no field of its own ([data-error]) is only scrolled to.
 */
export function revealFirstError(scope: HTMLElement | null) {
  const el = scope?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error]');
  if (!el) return;
  el.scrollIntoView({ block: "center" });
  if (!el.hasAttribute("data-error")) el.focus({ preventScroll: true });
}

/**
 * The keyboard's action key on a phone: "next" on every field but the last one typed into, which gets `last` ("go":
 * Enter continues to the next step; "send": it sends the form). Set after each render, so fields that come and go (a
 * name for "Other", an instalment row) are counted. A textarea keeps its own key: Enter starts a new line there.
 */
export function syncEnterKeyHints(form: HTMLFormElement | null, last: "go" | "send") {
  if (!form) return;
  const fields = textFields(form);
  fields.forEach((f, i) => {
    if (f instanceof HTMLInputElement) f.enterKeyHint = i < fields.length - 1 ? "next" : last;
  });
}

/**
 * On a touch screen the Next key moves on to the following field, as in an app, rather than sending the step
 * half-filled (iOS sends Enter for it; Android moves on by itself). Enter at a desktop keyboard still continues. A key
 * already handled (a combobox picking its highlighted option) is left alone.
 */
export function nextFieldOnEnter(e: React.KeyboardEvent<HTMLFormElement>) {
  const field = e.target;
  if (e.key !== "Enter" || e.defaultPrevented || !(field instanceof HTMLInputElement) || field.enterKeyHint !== "next") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const fields = textFields(e.currentTarget);
  const next = fields[fields.indexOf(field) + 1];
  if (!next) return;
  e.preventDefault();
  next.focus();
}
