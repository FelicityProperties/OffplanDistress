// The offer to install the site as an app, shared by the install card (src/components/app/InstallPrompt.tsx) and the
// menu's "Install the app" (src/components/app/InstallMenuItem.tsx). For client components.
//
// Chromium offers installation with a beforeinstallprompt event, often before React has hydrated:
// src/instrumentation-client.ts keeps it in window.__odInstallEvent and then fires "od:installable". This module also
// listens for the event itself, in case that early capture is missing. iOS Safari has no such event: there the card
// explains Share > Add to Home Screen. What the visitor decided is remembered in localStorage (od-install).

/** Chrome's beforeinstallprompt event: prompt() opens its install dialog, once per event, from a click. */
export type DeferredPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};
/** How this browser installs the site: "android" while Chrome's offer is held, "ios" in iOS Safari, else null. */
export type InstallPlatform = "android" | "ios" | null;
export type InstallState = { platform: InstallPlatform; standalone: boolean };
/** localStorage od-install: installed, or how often (and when last) the offer was turned down. */
export type InstallMemory = { installed?: true; dismissals?: number; dismissedAt?: number };

type OdWindow = Window & { __odInstallEvent?: Event };
type OdNavigator = Navigator & { standalone?: boolean };

const MEMORY_KEY = "od-install";
/** Window event: the menu asks for the install card now. */
export const INSTALL_OPEN_EVENT = "od:install-open";

const SERVER_STATE: InstallState = { platform: null, standalone: false };
let state = SERVER_STATE;
let deferred: DeferredPrompt | null = null;
let started = false;
const listeners = new Set<() => void>();

/** Running as the installed app (Android, desktop) or from the iOS home screen. */
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as OdNavigator).standalone === true;
}

/**
 * Safari on an iPhone or iPad (an iPad asks for the desktop site: a Mac with touch), where Share > Add to Home Screen
 * installs the site. navigator.standalone is false only there (in-app browsers leave it undefined), and Chrome,
 * Firefox, Edge, Opera and the Google app on iOS name themselves in the user agent.
 */
export function iosSafari() {
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return apple && (navigator as OdNavigator).standalone === false && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
}

function refresh() {
  const next: InstallState = { platform: deferred ? "android" : iosSafari() ? "ios" : null, standalone: isStandalone() };
  if (next.platform === state.platform && next.standalone === state.standalone) return;
  state = next;
  for (const listener of listeners) listener();
}

function keep(event: Event | undefined) {
  if (!event || typeof (event as DeferredPrompt).prompt !== "function") return;
  deferred = event as DeferredPrompt;
  refresh();
}

export function readInstallMemory(): InstallMemory {
  try {
    const memory: unknown = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? "{}");
    return memory && typeof memory === "object" ? (memory as InstallMemory) : {};
  } catch {
    return {};
  }
}

function remember(patch: InstallMemory) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...readInstallMemory(), ...patch }));
  } catch {}
}

/** "Not now", the close button, "Got it", or Cancel in Chrome's dialog. */
export function rememberDismissal() {
  remember({ dismissals: (Number(readInstallMemory().dismissals) || 0) + 1, dismissedAt: Date.now() });
}

/** Starts listening, once: Chrome's offer (kept early or arriving now) and an installation, however it was made. */
export function initInstallStore() {
  if (started || typeof window === "undefined") return;
  started = true;
  const w = window as OdWindow;
  keep(w.__odInstallEvent);
  window.addEventListener("od:installable", () => keep(w.__odInstallEvent));
  window.addEventListener("beforeinstallprompt", (event) => {
    // Also keeps Chrome's own mini-infobar away (it would cover the tab bar).
    event.preventDefault();
    keep(event);
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    w.__odInstallEvent = undefined;
    remember({ installed: true });
    refresh();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", refresh);
  refresh();
}

/** For useSyncExternalStore: subscribeInstall, installSnapshot, installServerSnapshot. */
export function subscribeInstall(onChange: () => void) {
  initInstallStore();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
export const installSnapshot = () => state;
export const installServerSnapshot = () => SERVER_STATE;

/** Chrome's install dialog. Call it inside a click (Chrome needs one); "unavailable" when no offer is held. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  // Single use: Chrome refuses a second prompt() on the same event (a new one comes with a later page load).
  deferred = null;
  (window as OdWindow).__odInstallEvent = undefined;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") remember({ installed: true });
    else rememberDismissal();
    return outcome;
  } catch {
    return "unavailable";
  } finally {
    refresh();
  }
}

/** The menu's "Install the app" on iOS: the card with the steps, at once (InstallPrompt.tsx listens). */
export function openInstallCard() {
  window.dispatchEvent(new Event(INSTALL_OPEN_EVENT));
}
