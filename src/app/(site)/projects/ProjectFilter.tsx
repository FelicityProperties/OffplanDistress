"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { searchKey } from "@/lib/place-names";

/**
 * A search box over the /projects cards: each card's `data-search` holds its project, developers and communities in
 * both scripts as searchKey text, and typing hides the cards that don't hold what was typed (matched as /deals' pickers
 * match: case, accents, Arabic letter variants). The cards are the server's; without JavaScript they all stay shown.
 * `none`: the "no project matches" line, with {q} for what was typed.
 */
export function ProjectFilter({
  label,
  placeholder,
  none,
  children,
}: {
  label: string;
  placeholder: string;
  none: string;
  children: ReactNode;
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const needle = searchKey(q);
    let shown = 0;
    for (const card of list.current?.querySelectorAll<HTMLElement>("[data-search]") ?? []) {
      const match = !needle || (card.dataset.search ?? "").includes(needle);
      card.hidden = !match;
      if (match) shown++;
    }
    setEmpty(!!needle && shown === 0);
  }, [q]);

  return (
    <>
      <div className="relative max-w-md">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 rounded-xl border-border/70 bg-card ps-10 shadow-card focus-visible:ring-2"
        />
      </div>
      <div ref={list} className="mt-6">
        {children}
      </div>
      <p role="status" className={empty ? "rounded-3xl border border-dashed border-border bg-card/70 px-6 py-10 text-center text-muted-foreground" : "sr-only"}>
        {empty ? none.replace("{q}", q.trim()) : ""}
      </p>
    </>
  );
}
