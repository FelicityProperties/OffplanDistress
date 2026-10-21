// Finds the Postgres connection string. Shared by the app (src/db/index.ts) and the build (scripts/migrate.mjs),
// so both always agree. The Vercel ↔ Neon integration's default names come first. A database added by hand is
// found under any name, pasted the way Neon's "Connect" dialog offers it: the bare URL, quoted, as a
// `psql '…'` command, as a `DATABASE_URL=…` line, or as the block of PGHOST= / PGUSER= / … parameters.

const POOLED = ["DATABASE_URL", "POSTGRES_URL"];
const UNPOOLED = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const URL_IN_TEXT = /postgres(?:ql)?:\/\/[^\s'"`]+/i;

const isDirect = (name) => /UNPOOLED|NON_POOLING/i.test(name);

function param(text, key) {
  return new RegExp(`(?:^|[\\s;])${key}\\s*=\\s*['"]?([^'"\\s;]+)`).exec(text)?.[1];
}

/** A postgres:// URL from a value as typed or pasted, or null. */
function extractUrl(value) {
  if (typeof value !== "string") return null;
  const match = URL_IN_TEXT.exec(value);
  if (match) return match[0];
  const host = param(value, "PGHOST");
  const user = param(value, "PGUSER");
  const database = param(value, "PGDATABASE");
  if (!host || !user || !database) return null;
  const password = param(value, "PGPASSWORD");
  const port = param(value, "PGPORT");
  const auth = encodeURIComponent(user) + (password ? `:${encodeURIComponent(password)}` : "");
  return `postgresql://${auth}@${host}${port ? `:${port}` : ""}/${encodeURIComponent(database)}?sslmode=require`;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ unpooled?: boolean }} [options] unpooled: prefer a direct connection (for migrations)
 * @returns {{ name: string, url: string } | null} the variable used and the connection string
 */
export function findDatabaseUrl(env, { unpooled = false } = {}) {
  for (const name of unpooled ? [...UNPOOLED, ...POOLED] : POOLED) {
    const url = extractUrl(env[name]);
    if (url) return { name, url };
  }
  const found = Object.keys(env)
    .filter((name) => !/NO_SSL|PRISMA/i.test(name) && extractUrl(env[name]))
    .sort();
  const name = found.find((n) => isDirect(n) === unpooled) ?? found[0];
  if (name) return { name, url: extractUrl(env[name]) };
  // Separate PGHOST / PGUSER / PGPASSWORD / PGDATABASE variables.
  const params = ["PGHOST", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGPORT"]
    .filter((key) => env[key])
    .map((key) => `${key}=${env[key]}`)
    .join("\n");
  const url = extractUrl(params);
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
        if (value.includes("://")) traits.push(`contains "${/^\s*['"`]?([a-z+.-]*):\/\//i.exec(value)?.[1] ?? "?"}://"`);
        else traits.push('no "://"');
        if (/\s/.test(value.trim())) traits.push("has spaces or line breaks");
      }
      return `${name} (${traits.join(", ")})`;
    });
}
