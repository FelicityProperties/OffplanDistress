// Finds the Postgres connection string. Shared by the app (src/db/index.ts) and the build (scripts/migrate.mjs),
// so both always agree. The Vercel ↔ Neon integration's default names come first; a database connected with a
// custom variable prefix (e.g. STORAGE_URL) is found by scanning for any postgres:// value.

const POOLED = ["DATABASE_URL", "POSTGRES_URL"];
const UNPOOLED = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

const isPostgres = (value) => typeof value === "string" && /^postgres(ql)?:\/\//i.test(value.trim());
const isDirect = (name) => /UNPOOLED|NON_POOLING/i.test(name);

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ unpooled?: boolean }} [options] unpooled: prefer a direct connection (for migrations)
 * @returns {{ name: string, url: string } | null} the variable used and its value
 */
export function findDatabaseUrl(env, { unpooled = false } = {}) {
  for (const name of unpooled ? [...UNPOOLED, ...POOLED] : POOLED) {
    if (isPostgres(env[name])) return { name, url: env[name].trim() };
  }
  const found = Object.keys(env)
    .filter((name) => isPostgres(env[name]) && !/NO_SSL|PRISMA/i.test(name))
    .sort();
  const name = found.find((n) => isDirect(n) === unpooled) ?? found[0];
  return name ? { name, url: env[name].trim() } : null;
}

/** Names (never values) of variables that look database-related, for build diagnostics. */
export function databaseVariableNames(env) {
  return Object.keys(env)
    .filter((name) => /DATABASE|POSTGRES|^PG|NEON/i.test(name))
    .sort();
}
