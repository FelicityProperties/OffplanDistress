// Finds the Postgres connection string. Shared by the app (src/db/index.ts) and the build (scripts/migrate.mjs),
// so both always agree. The Vercel ↔ Neon integration's default names come first. A database added by hand is
// found under any name, pasted the way Neon's "Connect" dialog offers it: the bare URL, quoted, as a
// `psql '…'` command, as a `DATABASE_URL=…` line, a Prisma snippet, the JDBC (Java) string, or the block of
// PGHOST= / PGUSER= / … parameters.

const POOLED = ["DATABASE_URL", "POSTGRES_URL"];
const UNPOOLED = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const URLS_IN_TEXT = /postgres(?:ql)?:\/\/[^\s'"`]+/gi;
// Variables that can mention a URL without being the database: Vercel's system variables (the commit
// message among them), public ones (never secret), and connection-string variants we don't want.
const NOT_A_DATABASE = /^(NEXT_PUBLIC_|VERCEL|NOW_|npm_|GIT)|COMMIT|MESSAGE|NO_SSL|PRISMA/i;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/i;

const isDirect = (name) => /UNPOOLED|NON_POOLING|DIRECT/i.test(name);

function param(text, key) {
  return new RegExp(`(?:^|[\\s;])${key}\\s*=\\s*['"]?([^'"\\s;]+)`).exec(text)?.[1];
}

/**
 * A usable connection string from one regex match, or null. Credentials given as ?user=&password= (JDBC
 * style) move into the URL, because the Neon driver only reads them there.
 */
function normalize(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  // a real host name (Docker-style single labels and bracketed IPv6 included), not "," or "…"
  if (!host || !(LOCAL.test(host) || /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i.test(host) || /^\[[0-9a-f:.]+\]$/i.test(host))) return null;
  if (url.pathname.length < 2) return null; // no database name
  if (!url.username && url.searchParams.has("user")) {
    url.username = encodeURIComponent(url.searchParams.get("user"));
    if (url.searchParams.has("password")) url.password = encodeURIComponent(url.searchParams.get("password"));
    url.searchParams.delete("user");
    url.searchParams.delete("password");
    return url.href;
  }
  if (!url.username && !LOCAL.test(host)) return null; // a hosted database always needs a user
  return raw;
}

/** Every usable postgres:// URL in a value, with what label (if any) precedes it. */
function urlsIn(value) {
  const found = [];
  for (const m of value.matchAll(URLS_IN_TEXT)) {
    const url = normalize(m[0]);
    if (!url) continue;
    const label = /([A-Z0-9_]+)\s*=\s*['"]?$/i.exec(value.slice(Math.max(0, m.index - 64), m.index))?.[1] ?? "";
    found.push({ url, direct: isDirect(label) || !/-pooler\./i.test(new URL(url).hostname) });
  }
  return found;
}

/** A postgres:// URL from a value as typed or pasted, or null. */
function extractUrl(value, unpooled) {
  if (typeof value !== "string") return null;
  const urls = urlsIn(value);
  if (urls.length) return (urls.find((u) => u.direct === unpooled) ?? urls[0]).url;
  const host = (unpooled && param(value, "PGHOST_UNPOOLED")) || param(value, "PGHOST");
  const user = param(value, "PGUSER");
  const database = param(value, "PGDATABASE");
  if (!host || !user || !database) return null;
  const password = param(value, "PGPASSWORD");
  const port = param(value, "PGPORT");
  const sslmode = param(value, "PGSSLMODE") ?? (LOCAL.test(host) ? null : "require");
  const auth = encodeURIComponent(user) + (password ? `:${encodeURIComponent(password)}` : "");
  return `postgresql://${auth}@${host}${port ? `:${port}` : ""}/${encodeURIComponent(database)}${sslmode ? `?sslmode=${sslmode}` : ""}`;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ unpooled?: boolean }} [options] unpooled: prefer a direct connection (for migrations)
 * @returns {{ name: string, url: string } | null} the variable used and the connection string
 */
export function findDatabaseUrl(env, { unpooled = false } = {}) {
  for (const name of unpooled ? [...UNPOOLED, ...POOLED] : POOLED) {
    const url = extractUrl(env[name], unpooled);
    if (url) return { name, url };
  }
  const found = Object.keys(env)
    .filter((name) => !NOT_A_DATABASE.test(name) && extractUrl(env[name], unpooled))
    .sort();
  const name = found.find((n) => isDirect(n) === unpooled) ?? found[0];
  if (name) return { name, url: extractUrl(env[name], unpooled) };
  // Separate PGHOST / PGUSER / PGPASSWORD / PGDATABASE variables.
  const params = ["PGHOST", "PGHOST_UNPOOLED", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGPORT", "PGSSLMODE"]
    .filter((key) => env[key])
    .map((key) => `${key}=${env[key]}`)
    .join("\n");
  const url = extractUrl(params, unpooled);
  return url ? { name: "PGHOST/PGUSER/PGDATABASE", url } : null;
}

/**
 * Database-related variables and the shape of their values, for build diagnostics. Never the values
 * themselves: they hold passwords and build logs are shared.
 */
export function describeDatabaseVariables(env) {
  return Object.keys(env)
    .filter((name) => /DATABASE|POSTGRES|^PG|NEON/i.test(name))
    .sort()
    .map((name) => {
      const value = env[name] ?? "";
      const traits = [`${value.length} characters`];
      if (!value.trim()) traits.push("empty");
      else {
        if (/^\s*['"`]/.test(value)) traits.push("starts with a quote");
        if (value.includes("://")) traits.push(`contains "${/^\s*['"`]?([a-z+.:-]*?):\/\//i.exec(value)?.[1] ?? "?"}://"`);
        else traits.push('no "://"');
        if (/\s/.test(value.trim())) traits.push("has spaces or line breaks");
        if (value.includes("://") && !urlsIn(value).length) traits.push("the URL in it is missing a user, host or database name");
      }
      return `${name} (${traits.join(", ")})`;
    });
}
