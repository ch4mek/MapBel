"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, UserPlus } from "lucide-react";
import { registerAction, type FormState } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/primitives";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle="Прогресс начинается после регистрации и сохраняется навсегда."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="displayName">
              Имя
            </label>
            <input
              id="displayName"
              name="displayName"
              className="input h-12"
              required
              minLength={2}
              maxLength={40}
              autoComplete="name"
              placeholder="Анна"
            />
          </div>
          <div>
            <label className="label" htmlFor="username">
              Имя пользователя
            </label>
            <input
              id="username"
              name="username"
              className="input h-12"
              required
              pattern="[a-zA-Z0-9_\-]{3,24}"
              autoComplete="username"
              placeholder="anna_travels"
            />
          </div>
        </div>
        <p className="hint -mt-2">Имя пользователя видят друзья — по нему вас найдут и отметят на фото.</p>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input h-12"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <p className="hint">Email никому не показывается.</p>
        </div>
        <div>
          <label className="label" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input h-12"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="hint">Не меньше 8 символов.</p>
        </div>
        {state.error && (
          <Alert tone="danger" icon={CircleAlert}>
            {state.error}
          </Alert>
        )}
        <button className="btn btn-primary btn-lg mt-2" type="submit" disabled={pending}>
          {pending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <UserPlus className="size-5" />
          )}
          {pending ? "Создаём аккаунт…" : "Начать путешествие"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-forest-700 hover:underline">
          Войти
        </Link>
      </p>
    </AuthShell>
  );
}
