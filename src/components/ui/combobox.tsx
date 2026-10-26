"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { initials, searchKey } from "@/lib/place-names";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

/** 0 = the name starts with the query, 1 = a word or the initials ("jvt") do, 2 = it appears anywhere; null = no match. */
function score(o: ComboboxOption, q: string) {
  const names = [searchKey(o.label), searchKey(o.value)];
  if (names.some((n) => n.startsWith(q))) return 0;
  const compact = q.replace(/\s/g, "");
  if (names.some((n) => n.split(" ").some((w) => w.startsWith(q))) || (compact.length > 1 && initials(o.value).startsWith(compact))) return 1;
  if (names.some((n) => n.includes(q))) return 2;
  return null;
}

/**
 * Type-to-search select (WAI-ARIA APG editable combobox with a listbox popup). The text box filters by the label in
 * the page's language and by the English name; arrows move through the matches, Enter picks one, Escape closes the list.
 * Focus stays in the text box: aria-activedescendant names the highlighted option, and only that option carries
 * aria-selected="true" (the others leave it out, so screen readers don't say "not selected" on every one). The current
 * choice is the text box's value, ticked in the list for sighted users.
 * `pinned` (e.g. "Other") is always listed last, whatever is typed, so a seller who can't find a name can still go on;
 * onChange then also gets the text they typed.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  pinned,
  placeholder,
  noMatchText,
  resultsText,
  invalid,
  describedBy,
  labelledBy,
}: {
  id?: string;
  value: string;
  onChange: (value: string, typed: string) => void;
  options: ComboboxOption[];
  pinned?: ComboboxOption;
  placeholder?: string;
  /** Shown above the pinned option when nothing else matches. */
  noMatchText?: string;
  /** Screen-reader announcement of the number of matches, e.g. n => `${n} results`. */
  resultsText?: (n: number) => string;
  invalid?: boolean;
  describedBy?: string;
  /** id of the visible label, which also names the list. */
  labelledBy?: string;
}) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-opt-${i}`;
  const input = useRef<HTMLInputElement>(null);
  // null: not typing, the box shows the selected label
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const all = useMemo(() => (pinned ? [...options, pinned] : options), [options, pinned]);
  const selected = all.find((o) => o.value === value);
  const q = searchKey(query ?? "");
  const matches = useMemo(() => {
    if (!q) return options;
    return options
      .map((o, i) => ({ o, i, s: score(o, q) }))
      .filter((m) => m.s != null)
      .sort((a, b) => a.s! - b.s! || a.i - b.i)
      .map((m) => m.o);
  }, [options, q]);
  const shown = pinned ? [...matches, pinned] : matches;
  // The highlighted option: what aria-activedescendant points at and Enter picks (-1 while the list is closed).
  const highlighted = open && active >= 0 && active < shown.length ? active : -1;

  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  function show(at?: number) {
    setOpen(true);
    const current = shown.findIndex((o) => o.value === value);
    setActive(at ?? (current >= 0 ? current : 0));
  }

  function pick(o: ComboboxOption) {
    onChange(o.value, query ?? "");
    setQuery(null);
    setOpen(false);
    setActive(-1);
  }

  function close() {
    // Leaving the box with an exact name typed counts as picking it; anything else goes back to the last choice.
    const exact = q ? all.find((o) => searchKey(o.label) === q || searchKey(o.value) === q) : undefined;
    if (exact && exact.value !== value) onChange(exact.value, query ?? "");
    setQuery(null);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = shown.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open || e.altKey) show(open ? active : undefined);
      else if (n) setActive((a) => (a + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show(n - 1);
      else if (n) setActive((a) => (a <= 0 ? n - 1 : a - 1));
    } else if (e.key === "Enter") {
      // Inside a form, Enter on an open list picks the option instead of submitting.
      if (highlighted >= 0) {
        e.preventDefault();
        pick(shown[highlighted]);
      }
    } else if (e.key === "Escape") {
      if (open || query != null) {
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        setOpen(false);
        setActive(-1);
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={input}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={query ?? selected?.label ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onClick={() => (open ? undefined : show())}
        onKeyDown={onKeyDown}
        onBlur={close}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent py-1 ps-3 pe-9 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
          invalid && "border-destructive/60",
        )}
      />
      <ChevronDown
        aria-hidden
        className={cn("pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 transition-transform", open && "rotate-180")}
      />
      {open && (
        <div
          // Keeps focus in the text box while the list is clicked or its scrollbar dragged.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {q && matches.length === 0 && noMatchText && (
            <p className="border-b px-3 py-2 text-xs text-muted-foreground">{noMatchText}</p>
          )}
          <ul id={listId} role="listbox" aria-labelledby={labelledBy} className="max-h-64 overflow-y-auto p-1">
            {shown.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={optionId(i)}
                  role="option"
                  // APG: "selected" is the highlighted option only; left out (not "false") on the rest.
                  aria-selected={i === highlighted ? true : undefined}
                  onClick={() => pick(o)}
                  onMouseMove={() => active !== i && setActive(i)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 ps-2 pe-8 text-sm",
                    i === highlighted && "bg-accent text-accent-foreground",
                    o === pinned && matches.length > 0 && "mt-1 border-t pt-2",
                  )}
                >
                  {o.label}
                  {isSelected && <Check aria-hidden className="absolute end-2 h-4 w-4" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {resultsText && (
        <span className="sr-only" aria-live="polite">
          {open && q ? resultsText(matches.length) : ""}
        </span>
      )}
    </div>
  );
}
