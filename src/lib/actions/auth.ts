"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,24}$/, "Имя пользователя: 3–24 символа (латиница, цифры, _ -)"),
  displayName: z.string().trim().min(2, "Минимум 2 символа").max(40),
  password: z.string().min(8, "Пароль — минимум 8 символов").max(100),
});

export interface FormState {
  error?: string;
  ok?: boolean;
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const { email, username, displayName, password } = parsed.data;

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return { error: "Этот email уже зарегистрирован" };
  const nameTaken = await prisma.user.findUnique({ where: { username } });
  if (nameTaken) return { error: "Это имя пользователя уже занято" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      profile: { create: {} },
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Аккаунт создан, но не удалось войти. Попробуйте войти вручную." };
    }
    throw error;
  }
  return { ok: true };
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Введите email и пароль" };
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль" };
    }
    throw error;
  }
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
