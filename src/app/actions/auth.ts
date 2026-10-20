"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  findUserByEmail,
  hashPassword,
  isAdminEmail,
  safeNext,
  verifyPassword,
} from "@/lib/auth";

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; ok?: boolean };

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Use at least 8 characters"),
  intent: z.enum(["buy", "sell", "both"]),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    intent: formData.get("intent") || "both",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { fullName, email, phone, password, intent } = parsed.data;

  if (await findUserByEmail(email)) {
    return { fieldErrors: { email: ["An account with this email already exists — sign in instead."] } };
  }

  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email: email.toLowerCase(),
      phone: phone || null,
      passwordHash: await hashPassword(password),
      intent,
      role: isAdminEmail(email) ? "admin" : "user",
    })
    .returning({ id: users.id });

  await createSession(user.id);
  const fallback = intent === "sell" ? "/sell" : "/dashboard";
  redirect(safeNext(formData.get("next"), fallback));
}

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const user = await findUserByEmail(parsed.data.email);
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  if (isAdminEmail(user.email) && user.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("next"), user.role === "admin" || isAdminEmail(user.email) ? "/admin" : "/dashboard"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
