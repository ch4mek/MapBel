"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    {},
  );
  return (
    <div className="mx-auto mt-8 w-full max-w-sm">
      <h1 className="text-2xl font-bold">Вход</h1>
      <form action={formAction} className="card mt-4 flex flex-col gap-3 p-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
            autoComplete="current-password"
          />
        </div>
        {state.error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Входим…" : "Войти"}
        </button>
        <p className="text-sm text-[var(--muted)]">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-[var(--brand)] underline">
            Зарегистрируйтесь
          </Link>
        </p>
      </form>
    </div>
  );
}
