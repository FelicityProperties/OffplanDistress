import type { Instrumentation } from "next";

// Every server error as one JSON line, so Vercel's log search can filter on the route or on the digest a user
// quotes from the error page. Sentry goes here once there is a DSN.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = (typeof err === "object" && err !== null ? err : {}) as { digest?: unknown; name?: unknown; message?: unknown };
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
      message: typeof e.message === "string" ? e.message : String(err),
    }),
  );
};
