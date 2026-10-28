"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, LogIn } from "lucide-react";
import { loginAction, type FormState } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/primitives";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <AuthShell title="С возвращением" subtitle="Войдите, чтобы продолжить исследовать карту.">
      <form action={formAction} className="flex flex-col gap-4">
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
            autoComplete="current-password"
          />
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
            <LogIn className="size-5" />
          )}
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Ещё нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-forest-700 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </AuthShell>
  );
}
