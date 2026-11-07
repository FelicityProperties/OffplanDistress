"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { initials, searchKey } from "@/lib/place-names";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

/** The list's usual height (max-h-64); the phone shell (below lg) is where it may open upward or get shorter. */
const LIST_MAX = 256;
const PHONE_SHELL = "(max-width: 1023.98px)";

/**
 * Where the open list fits on a phone: below the box, or above it when there is more room there, as tall as the room
 * allows. The room is the part of the screen still visible (the on-screen keyboard shrinks the visual viewport), less
 * the sticky header at the top (the page's scroll-padding-top, which clears it).
 */
function listPlace(box: HTMLElement, need: number) {
  const r = box.getBoundingClientRect();
  const vv = window.visualViewport;
  const top = vv ? vv.offsetTop : 0;
  const bottom = top + (vv ? vv.height : window.innerHeight);
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const below = bottom - r.bottom - 12;
  const above = r.top - Math.max(top, header) - 12;
  const up = below < need && above > below;
  return { up, maxHeight: Math.max(Math.min(LIST_MAX, up ? above : below), 120) };
}

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

  // Phones: the list opens where it fits (see listPlace), measured again as the keyboard comes and goes, the page
  // scrolls or the matches change. From lg it always opens below at its usual height, as before.
  const popup = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ up: boolean; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !window.matchMedia(PHONE_SHELL).matches) {
      setPlace(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = popup.current;
      const list = box?.querySelector("ul");
      if (!input.current || !box || !list) return;
      // The list's own height, plus what else the popup holds (the "not in the list" line, the borders).
      const need = Math.min(LIST_MAX, list.scrollHeight) + box.offsetHeight - list.offsetHeight;
      const next = listPlace(input.current, need);
      setPlace((p) => (p && p.up === next.up && Math.abs(p.maxHeight - next.maxHeight) < 2 ? p : next));
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const vv = window.visualViewport;
    window.addEventListener("resize", later);
    window.addEventListener("scroll", later, { passive: true });
    vv?.addEventListener("resize", later);
    vv?.addEventListener("scroll", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", later);
      window.removeEventListener("scroll", later);
      vv?.removeEventListener("resize", later);
      vv?.removeEventListener("scroll", later);
    };
  }, [open, shown.length]);

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
          // Phones (below lg): 44 px tall, like the Input.
          "flex h-9 w-full rounded-md border border-input bg-transparent py-1 ps-3 pe-9 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm max-lg:h-11",
          invalid && "border-destructive/60",
        )}
      />
      <ChevronDown
        aria-hidden
        className={cn("pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 transition-transform", open && "rotate-180")}
      />
      {open && (
        <div
          ref={popup}
          // Keeps focus in the text box while the list is clicked or its scrollbar dragged.
          onMouseDown={(e) => e.preventDefault()}
          style={place ? { maxHeight: place.maxHeight } : undefined}
          className={cn(
            "absolute inset-x-0 z-50 flex flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            place?.up ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {q && matches.length === 0 && noMatchText && (
            <p className="shrink-0 border-b px-3 py-2 text-xs text-muted-foreground">{noMatchText}</p>
          )}
          <ul id={listId} role="listbox" aria-labelledby={labelledBy} className="max-h-64 min-h-0 overflow-y-auto overscroll-contain p-1">
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
                    // Phones: 44 px rows with 16 px text.
                    "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 ps-2 pe-8 text-sm max-lg:min-h-11 max-lg:text-base",
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
