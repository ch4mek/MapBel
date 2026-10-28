"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Search, UserPlus } from "lucide-react";
import { sendFriendRequestAction, type ActionResult } from "@/lib/actions/social";
import { Alert } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";

export function FriendSearchForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(sendFriendRequestAction, {});
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Имя пользователя</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            className="input h-12 pl-11"
            name="query"
            placeholder="username или имя друга"
            autoComplete="off"
            required
          />
        </label>
        <SubmitButton pendingLabel="Отправляем…" className="btn btn-primary h-12">
          <UserPlus className="size-4" />
          Добавить в друзья
        </SubmitButton>
      </form>
      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      {state.ok && (
        <Alert tone="success" icon={CircleCheck}>
          Готово! Заявка отправлена или принята.
        </Alert>
      )}
    </div>
  );
}
