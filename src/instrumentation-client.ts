// Runs once in the browser before hydration (Next 16 instrumentation-client convention).

// 1. Chrome's install offer, kept for the install card (src/lib/install-prompt.ts reads window.__odInstallEvent), which
//    may mount after the event has fired. preventDefault also stops Chrome's own mini-infobar, which would sit on top
//    of the tab bar.
try {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    (window as Window & { __odInstallEvent?: Event }).__odInstallEvent = e;
    window.dispatchEvent(new Event("od:installable"));
  });
} catch {}

// 2. App Router navigations, for the progress bar (src/components/app/NavProgress.tsx). Not called for a full page
//    load or router.refresh().
export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  window.dispatchEvent(new CustomEvent("od:navstart", { detail: { url, navigationType } }));
}
