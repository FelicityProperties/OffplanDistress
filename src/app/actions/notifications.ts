"use server";

import { refresh } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export type NotificationActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marks one of the signed-in user's notifications as read. Ids belonging to anyone else are ignored. */
export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  const [user, t] = await Promise.all([getCurrentUser(), getT("notifications")]);
  if (!user) return { ok: false, error: t("error.signIn") };
  // Unknown or foreign ids are a silent no-op, so the action never reveals whether a notification exists.
  if (typeof id !== "string" || !UUID.test(id)) return { ok: true };
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id), isNull(notifications.readAt)));
  } catch (err) {
    console.error("markNotificationRead failed", err);
    return { ok: false, error: t("error.generic") };
  }
  refresh();
  return { ok: true };
}

/** Marks every unread notification of the signed-in user as read. */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const [user, t] = await Promise.all([getCurrentUser(), getT("notifications")]);
  if (!user) return { ok: false, error: t("error.signIn") };
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  } catch (err) {
    console.error("markAllNotificationsRead failed", err);
    return { ok: false, error: t("error.generic") };
  }
  refresh();
  return { ok: true };
}
