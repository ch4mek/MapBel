"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function FriendActions({
  kind,
  respond,
}: {
  kind: "respond" | "remove";
  respond: (accept: boolean) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(accept: boolean) {
    startTransition(async () => {
      await respond(accept);
      router.refresh();
    });
  }

  if (kind === "respond") {
    return (
      <span className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-primary !min-h-0 !px-2 !py-1 text-xs"
          disabled={pending}
          onClick={() => run(true)}
        >
          ✔ Принять
        </button>
        <button
          type="button"
          className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
          disabled={pending}
          onClick={() => run(false)}
        >
          ✖ Отклонить
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
      disabled={pending}
      onClick={() => run(false)}
    >
      Удалить из друзей
    </button>
  );
}
