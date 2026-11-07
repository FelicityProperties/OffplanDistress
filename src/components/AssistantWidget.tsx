"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import type { AssistantEvent } from "@/app/api/assistant/route";
import { useLocale, useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";
import { whatsappPrefill } from "@/components/WhatsAppButton";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

/** This tab's conversation (sessionStorage): it survives page loads and is gone when the tab closes. */
const STORE = "od-assistant";
const MAX_INPUT = 1000;
const STARTERS = ["starter.deals", "starter.budget", "starter.how", "starter.sell"] as const;
/** On a deal page the first suggestion is about that unit. */
const DEAL_STARTERS = ["starter.thisDeal", "starter.deals", "starter.how", "starter.sell"] as const;
/** The one-time hello next to the button (localStorage): shown once, a few seconds into a first visit. */
const NUDGE_KEY = "od-assistant-nudge";
const NUDGE_DELAY = 8000;
/** Our consoles have no chat. */
const HIDDEN = /^\/(?:admin|dashboard)(?:\/|$)/;

// A link in an answer: [label](https://…) or a bare https://… address (without bidi isolates or CJK punctuation).
const LINK_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s⁦-⁩<>"'）】」》，。、；]+/g;

function parseEvent(line: string): AssistantEvent | null {
  try {
    return JSON.parse(line) as AssistantEvent;
  } catch {
    return null;
  }
}

/** An answer as text with its links clickable; our own pages open in this tab, other sites in a new one. */
function Linked({ text, onInternal }: { text: string; onInternal: (path: string) => void }) {
  // Bold markers the model may still write.
  const clean = text.replace(/\*\*(.+?)\*\*/g, "$1");
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of clean.matchAll(LINK_RE)) {
    let href = m[2] ?? m[0];
    let end = m.index + m[0].length;
    if (!m[2]) {
      // Punctuation after an address belongs to the sentence.
      const trail = /[.,;:!?)\]]+$/.exec(href)?.[0] ?? "";
      href = href.slice(0, href.length - trail.length);
      end -= trail.length;
    }
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    parts.push(clean.slice(last, m.index));
    const internal = url.host === window.location.host;
    const label = m[1] ?? href.replace(/^https?:\/\//, "");
    parts.push(
      <a
        key={m.index}
        href={href}
        dir={m[1] ? undefined : "ltr"}
        className="font-medium underline underline-offset-2"
        {...(internal
          ? {
              onClick: (e: React.MouseEvent) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onInternal(url.pathname + url.search);
              },
            }
          : { target: "_blank", rel: "noopener noreferrer nofollow" })}
      >
        {label}
      </a>,
    );
    last = end;
  }
  parts.push(clean.slice(last));
  return <>{parts}</>;
}

/** Right to left when a message is mostly Arabic (an Arabic answer listing "Reef 998, …" still reads from the right). */
function textDir(text: string) {
  const arabic = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  return arabic > latin ? "rtl" : arabic || latin ? "ltr" : undefined;
}

function Bubble({ mine, label, text, children }: { mine: boolean; label: string; text: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <span className="sr-only">{label}:</span>
      <div
        dir={textDir(text)}
        data-bubble
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed wrap-anywhere",
          mine ? "rounded-ee-md bg-ink text-primary-foreground" : "rounded-es-md bg-muted text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The AI assistant (src/app/api/assistant/route.ts): a chat button above the WhatsApp one and a small chat window that
 * answers in the visitor's language. Shown only when the assistant is set up (ANTHROPIC_API_KEY, src/lib/assistant.ts).
 */
export function AssistantWidget() {
  const t = useT("assistant");
  const tm = useT("marketing");
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nudge, setNudge] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The conversation so far in this tab (after hydration, so the server and first client render agree).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as { open?: boolean; msgs?: Msg[] } | null;
      if (saved?.msgs?.length) setMsgs(saved.msgs.filter((m) => m.content).slice(-40));
      if (saved?.open) setOpen(true);
    } catch {}
    setLoaded(true);
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!loaded || busy) return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ open, msgs: msgs.slice(-40) }));
    } catch {}
  }, [loaded, busy, open, msgs]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // The hello, unless this browser has seen it (or chatted) before.
  useEffect(() => {
    if (!loaded || open || msgs.length) return;
    try {
      if (localStorage.getItem(NUDGE_KEY) != null) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setNudge(true), NUDGE_DELAY);
    return () => clearTimeout(timer);
  }, [loaded, open, msgs.length]);

  if (HIDDEN.test(stripLocale(pathname))) return null;

  const dismissNudge = () => {
    setNudge(false);
    try {
      localStorage.setItem(NUDGE_KEY, "1");
    } catch {}
  };
  // The WhatsApp message the floating button would open with on this page (a deal page names the deal).
  const prefill = whatsappPrefill(pathname);
  const starters = prefill.key === "whatsapp.prefill.deal" ? DEAL_STARTERS : STARTERS;

  const errorText = (code: "failed" | "busy" | "refusal") => t(`error.${code}`, { whatsapp: `https://wa.me/${BRAND.whatsapp}` });
  /** Updates the answer being written (the last message). */
  const update = (fn: (m: Msg) => Msg) =>
    setMsgs((all) => (all.length ? [...all.slice(0, -1), fn(all[all.length - 1])] : all));

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const reset = () => {
    abortRef.current?.abort();
    setMsgs([]);
    setBusy(false);
    inputRef.current?.focus();
  };

  const goTo = (path: string) => {
    router.push(path);
    // On a phone the window covers the page: get out of the way.
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  };

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_INPUT);
    if (!question || busy) return;
    const history: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((m) => !m.error && m.content).map(({ role, content }) => ({ role, content })),
          locale,
          path: pathname,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        update(() => ({ role: "assistant", content: errorText(res.status === 429 ? "busy" : "failed"), error: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (let nl = buffer.indexOf("\n"); nl >= 0; nl = buffer.indexOf("\n")) {
          const ev = parseEvent(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          if (!ev) continue;
          if (ev.t === "text") update((m) => ({ ...m, content: m.content + ev.v }));
          else if (ev.t === "reset") update((m) => ({ ...m, content: "" }));
          else if (ev.t === "error")
            update((m) =>
              m.content
                ? { ...m, content: `${m.content}\n\n${errorText(ev.code)}` }
                : { role: "assistant", content: errorText(ev.code), error: true },
            );
        }
      }
    } catch {
      if (ctrl.signal.aborted) return;
      update((m) => (m.content ? m : { role: "assistant", content: errorText("failed"), error: true }));
    } finally {
      if (abortRef.current === ctrl) {
        setBusy(false);
        // An answer that never came is not kept.
        setMsgs((all) => (all.at(-1)?.role === "assistant" && !all.at(-1)?.content ? all.slice(0, -1) : all));
      }
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => {
          if (open) return close();
          dismissNudge();
          setOpen(true);
        }}
        aria-label={open ? t("close") : t("launcher")}
        aria-expanded={open}
        title={open ? t("close") : t("launcher")}
        data-assistant="launcher"
        className="fixed bottom-24 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-primary-foreground shadow-lift ring-4 ring-background/70 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-ring"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <Sparkles className="h-6 w-6" aria-hidden />}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label={t("title")}
          data-assistant="panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed inset-x-2 bottom-2 z-50 flex h-[min(38rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-lift sm:inset-x-auto sm:bottom-40 sm:end-5 sm:h-[min(36rem,calc(100dvh-11rem))] sm:w-[24rem]"
        >
          <header className="flex items-start gap-3 bg-ink px-4 py-3 text-primary-foreground">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{t("title")}</h2>
              <p className="text-xs leading-snug opacity-80">{t("subtitle")}</p>
            </div>
            {msgs.length > 0 && (
              <button
                type="button"
                onClick={reset}
                aria-label={t("newChat")}
                title={t("newChat")}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              title={t("close")}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
            <Bubble mine={false} label={t("bot")} text={t("greeting")}>
              {t("greeting")}
            </Bubble>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2 ps-1">
                {starters.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => send(t(k))}
                    className="rounded-full border bg-background px-3 py-1.5 text-start text-xs font-medium transition-colors hover:border-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <Bubble key={i} mine={m.role === "user"} label={m.role === "user" ? t("you") : t("bot")} text={m.content}>
                {m.content ? (
                  m.role === "user" ? m.content : <Linked text={m.content} onInternal={goTo} />
                ) : (
                  <span className="animate-pulse text-muted-foreground">{t("thinking")}</span>
                )}
              </Bubble>
            ))}
          </div>

          <form
            className="border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                dir="auto"
                maxLength={MAX_INPUT}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter is a new line, and Enter that picks a Chinese or Arabic IME candidate is neither.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t("placeholder")}
                aria-label={t("placeholder")}
                className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t("send")}
                title={t("send")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t("disclaimer")}</p>
            {BRAND.whatsapp && (
              <a
                href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm(prefill.key, { ref: prefill.ref }))}`}
                target="_blank"
                rel="noopener noreferrer"
                data-wa="assistant"
                className="mt-1.5 flex w-fit items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline focus-visible:underline focus-visible:outline-none dark:text-emerald-400"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                {t("human")}
              </a>
            )}
          </form>
        </section>
      )}

      {nudge && !open && (
        <div
          data-assistant="nudge"
          className="fixed bottom-[6.4rem] end-[5.25rem] z-40 flex max-w-[16rem] items-center gap-1 rounded-2xl rounded-ee-md border bg-background py-1.5 ps-3 pe-1 text-sm shadow-lift animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <button
            type="button"
            onClick={() => {
              dismissNudge();
              setOpen(true);
            }}
            className="text-start font-medium leading-snug focus-visible:underline focus-visible:outline-none"
          >
            {t("nudge")}
          </button>
          <button
            type="button"
            onClick={dismissNudge}
            aria-label={t("nudgeDismiss")}
            title={t("nudgeDismiss")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
