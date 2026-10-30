"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLocale } from "@/i18n/client";

// The hidden part of the public forms (src/lib/spam.ts): the honeypot, the form token and, when a site key is set,
// the Cloudflare Turnstile widget. Rendered inside a `relative` form; the fields post with the rest of it.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
/** A token the page came with is replaced at mount once it is this old (a tab left open); tokens last two hours. */
const STALE_MS = 60 * 60 * 1000;

export function SpamGuard({
  token,
  resetKey,
}: {
  /** issueFormToken() from the server component that rendered the form; fetched from /api/form-token without one. */
  token?: string;
  /** Changes after a refused submission, so the Turnstile widget hands out a new token (each one is single-use). */
  resetKey?: number;
}) {
  return (
    <>
      {/* The honeypot: off-screen and skipped by keyboards and screen readers, so only a bot fills it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <FormToken token={token} />
      {SITE_KEY && <Turnstile siteKey={SITE_KEY} resetKey={resetKey} />}
    </>
  );
}

function FormToken({ token }: { token?: string }) {
  const [value, setValue] = useState(token ?? "");
  useEffect(() => {
    if (token && Date.now() - Number(token.split(".")[0]) < STALE_MS) return;
    const ctrl = new AbortController();
    fetch("/api/form-token", { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { token?: unknown }) => {
        if (typeof d.token === "string") setValue(d.token);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [token]);
  return <input type="hidden" name="formToken" value={value} />;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Explicit rendering, so a form that mounts after the script loaded (the viewing dialog) still gets its widget. The
 * widget adds the hidden `cf-turnstile-response` field to the form itself. Managed or invisible is the widget's own
 * setting in the Cloudflare dashboard; "interaction-only" shows it only when a visitor has to do something.
 */
function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey?: number }) {
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current;
    const ts = window.turnstile;
    if (!el || !ts) return;
    const id = ts.render(el, {
      sitekey: siteKey,
      appearance: "interaction-only",
      size: "flexible",
      language: locale,
      "refresh-expired": "auto",
    });
    widget.current = id;
    return () => {
      widget.current = null;
      ts.remove(id);
    };
  }, [siteKey, locale, loaded]);
  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);
  return (
    <>
      <Script src={TURNSTILE_SCRIPT} strategy="afterInteractive" onLoad={() => setLoaded(true)} />
      <div ref={box} data-testid="turnstile" />
    </>
  );
}
