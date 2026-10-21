import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { findDatabaseUrl } from "./database-url.mjs";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

function createDb(): DB {
  const url = findDatabaseUrl(process.env)?.url;
  if (!url) {
    throw new Error("No database connection string (DATABASE_URL) is set. Connect the Neon database in Vercel → Storage.");
  }
  // Neon over HTTP on Vercel; plain node-postgres for any other Postgres (local dev, CI).
  // Both expose the same query builder, so the rest of the app doesn't care which one it gets.
  if (new URL(url).hostname.endsWith(".neon.tech")) {
    return drizzleNeon(neon(url), { schema }) as unknown as DB;
  }
  return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema });
}

const globalForDb = globalThis as unknown as { __db?: DB };

export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    globalForDb.__db ??= createDb();
    const value = Reflect.get(globalForDb.__db, prop);
    return typeof value === "function" ? value.bind(globalForDb.__db) : value;
  },
});

export { schema };
