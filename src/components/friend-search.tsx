"use client";

import { useActionState } from "react";
import {
  sendFriendRequestAction,
  type ActionResult,
} from "@/lib/actions/social";
import { SubmitButton } from "@/components/submit-button";

export function FriendSearchForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    sendFriendRequestAction,
    {},
  );
  return (
    <>
      <form action={formAction} className="mt-2 flex gap-2">
        <input
          className="input"
          name="query"
          placeholder="username или отображаемое имя"
          aria-label="Имя пользователя"
          required
        />
        <SubmitButton pendingLabel="Отправляем…">Отправить заявку</SubmitButton>
      </form>
      {state.error && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-2 text-sm text-emerald-700" role="status">
          Заявка отправлена.
        </p>
      )}
    </>
  );
}
