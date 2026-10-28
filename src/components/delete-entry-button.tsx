"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Trash2 } from "lucide-react";
import { deleteDiaryEntryAction } from "@/lib/actions/diary";
import { Alert } from "@/components/ui/primitives";

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
      <button type="button" className="btn btn-danger-soft btn-sm" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" />
        Удалить запись
      </button>
    );
  }
  return (
    <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">Удалить запись вместе с фотографиями?</p>
      <p className="mt-1 text-sm text-red-800/80">
        Подтверждённые визиты, очки и открытые зоны сохранятся.
      </p>
      {error && (
        <Alert tone="danger" icon={CircleAlert} className="mt-3">
          {error}
        </Alert>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={pending}>
          {pending ? "Удаляем…" : "Да, удалить"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}
