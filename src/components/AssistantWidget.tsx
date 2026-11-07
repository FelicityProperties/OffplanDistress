"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import type { AssistantEvent } from "@/app/api/assistant/route";
import { useLocale, useT } from "@/i18n/client";
import {
  FAB,
  FAB_AWAY,
  FAB_VARS,
  PHONE_SHELL,
  floatingPlaces,
  onSettled,
  pageUnder,
  restBox,
  typingOnTouch,
  useClearOfPage,
  whatsappPrefill,
} from "@/components/WhatsAppButton";
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
/** Once on screen, the hello leaves by itself. */
const NUDGE_TIME = 15000;
/** Phones (and phones held sideways): the chat takes the whole screen. */
const FULL_SCREEN = "(max-width: 639.98px), (max-height: 500px) and (pointer: coarse)";

/** Something else has the screen: the keyboard, the install card, a dialog or the menu, or the page is scrolling down. */
function screenBusy() {
  const html = document.documentElement;
  return (
    html.hasAttribute("data-keyboard") ||
    html.hasAttribute("data-install-prompt") ||
    html.getAttribute("data-scroll") === "down" ||
    typingOnTouch() ||
    !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')
  );
}

/** Tab and Shift+Tab stay inside the full-screen chat, as in any modal window. */
function keepFocusIn(e: React.KeyboardEvent<HTMLElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), textarea")].filter((el) => el.offsetParent);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

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
  // The hello: "wait" (due, laid out unseen until nothing would be under it), then "on".
  const [nudge, setNudge] = useState<"off" | "wait" | "on">("off");
  // The chat fills the screen (phones), instead of the small window.
  const [full, setFull] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const nudgeRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const place = floatingPlaces(pathname).assistant;
  const launcherClear = useClearOfPage(launcherRef, pathname, place === "always" && !open);

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
    // A new chat starts at the greeting (on a small phone it and the suggestions overflow the list).
    if (list) list.scrollTop = msgs.length ? list.scrollHeight : 0;
  }, [msgs, open]);

  useEffect(() => {
    const screen = window.matchMedia(FULL_SCREEN);
    const update = () => setFull(screen.matches);
    update();
    screen.addEventListener("change", update);
    return () => screen.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Phones: no keyboard over the greeting and the suggestions; the window itself takes focus (screen readers start there).
    if (window.matchMedia(FULL_SCREEN).matches) panelRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Full screen: the page behind stays put, and the window follows the visible area, so the text box sits right above
  // the on-screen keyboard (iOS and Android shrink and shift the visual viewport, not the page).
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !full || !panel) return;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    const vv = window.visualViewport;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!vv) return;
        panel.style.setProperty("--assistant-vvh", `${vv.height}px`);
        panel.style.transform = vv.offsetTop ? `translateY(${vv.offsetTop}px)` : "";
        // The keyboard covers the home indicator: no safe-area gap above it.
        panel.style.setProperty("--assistant-safe-b", window.innerHeight - vv.height > 150 ? "0px" : "env(safe-area-inset-bottom, 0px)");
      });
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      html.style.overflow = overflow;
      panel.style.removeProperty("--assistant-vvh");
      panel.style.removeProperty("--assistant-safe-b");
      panel.style.transform = "";
    };
  }, [open, full]);

  // The hello, unless this browser has seen it (or chatted) before.
  useEffect(() => {
    if (!loaded || open || msgs.length) return;
    try {
      if (localStorage.getItem(NUDGE_KEY) != null) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setNudge((n) => (n === "off" ? "wait" : n)), NUDGE_DELAY);
    return () => clearTimeout(timer);
  }, [loaded, open, msgs.length]);

  // Due: from lg it shows at once, as it always did. On phones only once it can't hide anything: the launcher is on
  // screen, nothing else has the screen, and no text, picture or control of the page is where the bubble goes.
  useEffect(() => {
    if (nudge !== "wait") return;
    const phone = window.matchMedia(PHONE_SHELL);
    const check = () => {
      const launcher = launcherRef.current;
      const bubble = nudgeRef.current;
      if (phone.matches) {
        if (!launcher || !bubble || !launcher.offsetWidth || screenBusy()) return;
        // The launcher's own look runs in the same pass and may not have rendered yet: ask the page directly.
        if (pageUnder(restBox(launcher)) || pageUnder(restBox(bubble), true)) return;
      }
      setNudge("on");
      // Seen once it has been shown: it never comes back.
      try {
        localStorage.setItem(NUDGE_KEY, "1");
      } catch {}
    };
    const stop = onSettled(check);
    const first = requestAnimationFrame(check);
    return () => {
      stop();
      cancelAnimationFrame(first);
    };
  }, [nudge]);

  // On screen: gone after a while, and on phones as soon as the page scrolls under it.
  useEffect(() => {
    if (nudge !== "on") return;
    const timer = setTimeout(() => setNudge("off"), NUDGE_TIME);
    const phone = window.matchMedia(PHONE_SHELL);
    const from = window.scrollY;
    const onScroll = () => {
      if (phone.matches && Math.abs(window.scrollY - from) > 40) setNudge("off");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [nudge]);

  if (place === "never") return null;

  const dismissNudge = () => {
    setNudge("off");
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
    // Phones: the new greeting and suggestions stay in view (no keyboard).
    if (full) panelRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus();
  };

  const goTo = (path: string) => {
    router.push(path);
    // On a phone the window covers the page: get out of the way.
    if (full) setOpen(false);
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
        // Floating column (WhatsAppButton.tsx): above the WhatsApp button, in its slot where that one is not shown; hides
        // while scrolling down (globals.css) and over the page's controls on phones.
        data-fab=""
        data-fab-autohide=""
        className={cn(
          FAB_VARS,
          "fixed z-40 grid place-items-center rounded-full bg-ink text-primary-foreground shadow-lift ring-4 ring-background/70 transition-[bottom,opacity,translate,scale,visibility] duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-ring motion-reduce:transition-none print:hidden",
          !BRAND.whatsapp && "[--fab-wa-slot:0px]",
          place === "desktop" ? "max-lg:hidden" : !launcherClear && !open && FAB_AWAY,
        )}
        style={{ insetInlineEnd: FAB.edge, bottom: `calc(${FAB.base} + ${FAB.edge} + ${FAB.waSlot})`, width: FAB.size, height: FAB.size }}
      >
        {open ? <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden /> : <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />}
      </button>

      {open && (
        <section
          ref={panelRef}
          role="dialog"
          aria-label={t("title")}
          // Full screen it is a modal window: the page behind is out of reach (scroll locked, focus kept inside).
          aria-modal={full || undefined}
          tabIndex={full ? -1 : undefined}
          data-assistant="panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "Tab" && full) keepFocusIn(e);
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background",
            full
              ? "inset-x-0 top-0 outline-none"
              : "inset-x-2 bottom-2 h-[min(38rem,calc(100dvh-1rem))] rounded-2xl border shadow-lift sm:inset-x-auto sm:bottom-40 sm:end-5 sm:h-[min(36rem,calc(100dvh-11rem))] sm:w-[24rem]",
          )}
          style={full ? { height: "var(--assistant-vvh, 100dvh)" } : undefined}
        >
          <header
            className={cn("flex gap-3 bg-ink px-4 py-3 text-primary-foreground", full ? "items-center pe-2" : "items-start")}
            style={full ? { paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" } : undefined}
          >
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground", !full && "mt-0.5")}>
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{t("title")}</h2>
              {/* Phones: one short line, so the conversation keeps the room. */}
              <p className={cn("text-xs leading-snug opacity-80", full && "truncate")}>{full ? t("subtitleShort") : t("subtitle")}</p>
            </div>
            {msgs.length > 0 && (
              <button
                type="button"
                onClick={reset}
                aria-label={t("newChat")}
                title={t("newChat")}
                className={cn(
                  "grid shrink-0 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  full ? "h-11 w-11 active:bg-white/15" : "h-8 w-8",
                )}
              >
                <RotateCcw className={full ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              title={t("close")}
              className={cn(
                "grid shrink-0 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                full ? "h-11 w-11 active:bg-white/15" : "h-8 w-8",
              )}
            >
              <X className={full ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
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
                    className={cn(
                      "rounded-full border bg-background text-start font-medium transition-colors hover:border-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      full ? "min-h-11 px-3.5 py-2 text-sm active:bg-muted" : "px-3 py-1.5 text-xs",
                    )}
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
            className="group border-t p-3"
            style={full ? { paddingBottom: "max(0.75rem, var(--assistant-safe-b, env(safe-area-inset-bottom, 0px)))" } : undefined}
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
                // Enter sends: the on-screen keyboard says so.
                enterKeyHint="send"
                className={cn(
                  "field-sizing-content flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                  full ? "max-h-24 min-h-11" : "max-h-32 min-h-10",
                )}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t("send")}
                title={t("send")}
                className={cn(
                  "grid shrink-0 place-items-center rounded-xl bg-ink text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  full ? "h-11 w-11" : "h-10 w-10",
                )}
              >
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </button>
            </div>
            {/* Phones: while typing, the keyboard leaves little room; these two come back when it closes. */}
            <p className={cn("mt-2 text-muted-foreground", full ? "text-xs group-has-[textarea:focus]:hidden" : "text-[11px]", "leading-snug")}>
              {t("disclaimer")}
            </p>
            {BRAND.whatsapp && (
              <a
                href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(tm(prefill.key, { ref: prefill.ref }))}`}
                target="_blank"
                rel="noopener noreferrer"
                data-wa="assistant"
                className={cn(
                  "flex w-fit items-center gap-1.5 font-medium text-emerald-700 hover:underline focus-visible:underline focus-visible:outline-none dark:text-emerald-400",
                  full ? "min-h-11 text-sm group-has-[textarea:focus]:hidden" : "mt-1.5 text-xs",
                )}
              >
                <MessageCircle className={full ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
                {t("human")}
              </a>
            )}
          </form>
        </section>
      )}

      {nudge !== "off" && !open && (
        <div
          ref={nudgeRef}
          // While due ("wait") it is laid out unseen, so its place can be checked, under another name than the hello
          // (the install card waits for [data-assistant="nudge"] to go).
          data-assistant={nudge === "on" ? "nudge" : "nudge-due"}
          data-fab={nudge === "on" ? "" : undefined}
          data-fab-autohide=""
          aria-hidden={nudge === "on" ? undefined : true}
          className={cn(
            FAB_VARS,
            "fixed z-40 flex items-center gap-1 rounded-2xl rounded-ee-md border bg-background py-1.5 ps-3 pe-1 text-sm shadow-lift max-lg:py-1 print:hidden",
            nudge === "on" ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : "invisible",
            !BRAND.whatsapp && "[--fab-wa-slot:0px]",
            place === "desktop" ? "max-lg:hidden" : !launcherClear && FAB_AWAY,
          )}
          // Beside the launcher, at least one edge's width from the other side of the screen (16 px on a 320 px phone).
          style={{
            bottom: `calc(${FAB.base} + ${FAB.edge} + ${FAB.waSlot} + 0.4rem)`,
            insetInlineEnd: `calc(${FAB.edge} + ${FAB.size} + 0.5rem)`,
            maxWidth: `min(16rem, calc(100vw - 2 * ${FAB.edge} - ${FAB.size} - 0.5rem))`,
          }}
        >
          <button
            type="button"
            tabIndex={nudge === "on" ? undefined : -1}
            onClick={() => {
              dismissNudge();
              setOpen(true);
            }}
            className="text-start font-medium leading-snug focus-visible:underline focus-visible:outline-none max-lg:min-h-11"
          >
            {t("nudge")}
          </button>
          <button
            type="button"
            tabIndex={nudge === "on" ? undefined : -1}
            onClick={dismissNudge}
            aria-label={t("nudgeDismiss")}
            title={t("nudgeDismiss")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:h-11 max-lg:w-11 max-lg:active:bg-muted"
          >
            <X className="h-3.5 w-3.5 max-lg:h-4 max-lg:w-4" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
