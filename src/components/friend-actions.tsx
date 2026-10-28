"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, UserMinus, X } from "lucide-react";

export function FriendActions({
  kind,
  respond,
}: {
  kind: "respond" | "remove";
  respond: (accept: boolean) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function run(accept: boolean) {
    startTransition(async () => {
      await respond(accept);
      router.refresh();
    });
  }

  if (kind === "respond") {
    return (
      <span className="flex gap-1.5">
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(true)}>
          <Check className="size-3.5" />
          Принять
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-icon w-9"
          disabled={pending}
          onClick={() => run(false)}
          aria-label="Отклонить"
          title="Отклонить"
        >
          <X className="size-4" />
        </button>
      </span>
    );
  }

  if (confirm) {
    return (
      <span className="flex gap-1.5">
        <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(false)}>
          Удалить
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(false)}>
          Отмена
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-subtle btn-sm btn-icon w-9"
      onClick={() => setConfirm(true)}
      aria-label="Удалить из друзей"
      title="Удалить из друзей"
    >
      <UserMinus className="size-4" />
    </button>
  );
}
