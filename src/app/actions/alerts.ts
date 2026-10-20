"use server";

import { refresh } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns the daily new-matches alert on or off for one of the current user's saved searches. */
export async function toggleSearchAlerts(id: string, enabled: boolean): Promise<{ ok?: true; error?: string }> {
  const t = await getT("searches");
  const user = await getCurrentUser();
  if (!user) return { error: t("error.signIn") };
  if (typeof id !== "string" || !UUID.test(id) || typeof enabled !== "boolean") return { error: t("error.generic") };

  try {
    const updated = await db
      .update(savedSearches)
      .set(
        enabled
          ? {
              alerts: true,
              // Switching back on looks forward from now, so the next alert doesn't replay everything
              // published while alerts were off. Already-on searches keep their place.
              lastAlertedAt: sql`case when ${savedSearches.alerts} then ${savedSearches.lastAlertedAt} else now() end`,
            }
          : { alerts: false },
      )
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
      .returning({ id: savedSearches.id });
    if (!updated.length) return { error: t("error.notFound") };
  } catch (err) {
    console.error("[alerts] toggle failed", err);
    return { error: t("error.generic") };
  }

  refresh();
  return { ok: true };
}
