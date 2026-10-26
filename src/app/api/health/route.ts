import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

// Uptime check for an external monitor: 200 {ok: true, db: "up"} when the site can reach its database,
// 503 otherwise. Never cached, and never says why the database is down (that goes to the logs).

const DB_TIMEOUT_MS = 3000;

export async function GET() {
  await connection();
  const database = await pingDatabase();
  const ok = database === "up";
  return Response.json({ ok, db: database }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

async function pingDatabase(): Promise<"up" | "down" | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), DB_TIMEOUT_MS);
  });
  // async wrapper: a missing DATABASE_URL throws synchronously when `db` is first touched.
  const query = (async () => {
    await db.execute(sql`select 1`);
    return "up" as const;
  })();
  try {
    const result = await Promise.race([query, timeout]);
    if (result === "timeout") console.error(`[health] database did not answer within ${DB_TIMEOUT_MS} ms`);
    return result;
  } catch (err) {
    console.error("[health] database check failed", err);
    return "down";
  } finally {
    clearTimeout(timer);
    query.catch(() => {}); // a late failure after the timeout has nobody waiting for it
  }
}
