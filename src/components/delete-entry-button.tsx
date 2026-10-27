"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDiaryEntryAction } from "@/lib/actions/diary";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await deleteDiaryEntryAction(entryId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/diary");
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-danger w-fit"
        onClick={() => setConfirming(true)}
      >
        🗑 Удалить запись
      </button>
    );
  }
  return (
    <div className="card border-[var(--danger)] p-4">
      <p className="text-sm">
        Удалить запись? Фотографии будут удалены вместе с ней, но подтверждённые
        визиты и очки сохранятся.
      </p>
      {error && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-danger" onClick={remove} disabled={pending}>
          Да, удалить
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}
