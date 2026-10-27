"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type FormState } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAction,
    {},
  );
  return (
    <div className="mx-auto mt-8 w-full max-w-sm">
      <h1 className="text-2xl font-bold">Регистрация</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Прогресс начинается после регистрации и сохраняется навсегда.
      </p>
      <form action={formAction} className="card mt-4 flex flex-col gap-3 p-4">
        <div>
          <label className="label" htmlFor="displayName">
            Отображаемое имя
          </label>
          <input id="displayName" name="displayName" className="input" required minLength={2} maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="username">
            Имя пользователя (для поиска и отметок)
          </label>
          <input
            id="username"
            name="username"
            className="input"
            required
            pattern="[a-zA-Z0-9_-]{3,24}"
            placeholder="traveler_minsk"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Пароль (минимум 8 символов)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {state.error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Создаём аккаунт…" : "Создать аккаунт"}
        </button>
        <p className="text-sm text-[var(--muted)]">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-[var(--brand)] underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
