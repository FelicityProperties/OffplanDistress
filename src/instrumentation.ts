import type { Instrumentation } from "next";

// Every server error as one JSON line, so Vercel's log search can filter on the route or on the digest a user
// quotes from the error page. Sentry goes here once there is a DSN.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = (typeof err === "object" && err !== null ? err : {}) as { digest?: unknown; name?: unknown; message?: unknown; cause?: unknown };
  const cause = (typeof e.cause === "object" && e.cause !== null ? e.cause : {}) as { message?: unknown };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      digest: e.digest == null ? undefined : String(e.digest),
      route: context.routePath,
      routeType: context.routeType,
      method: request.method,
      // Without the query string: it can carry tokens (password-reset links).
      path: request.path.split("?")[0],
      error: typeof e.name === "string" ? e.name : undefined,
      message: firstLine(typeof e.message === "string" ? e.message : String(err)),
      cause: typeof cause.message === "string" ? firstLine(cause.message) : undefined,
    }),
  );
};

/** Drizzle puts the query's parameters (possibly personal data) on the lines after the first; keep them out. */
function firstLine(s: string) {
  return s.split("\n")[0].slice(0, 500);
}
