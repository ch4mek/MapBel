"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondPhotoTagAction, removePhotoTagAction } from "@/lib/actions/diary";

export function TagActions({ tagId, kind }: { tagId: string; kind: "respond" | "remove" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  if (kind === "respond") {
    return (
      <span className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() => run(() => respondPhotoTagAction(tagId, true))}
        >
          <Check className="size-3.5" />
          Принять
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={() => run(() => respondPhotoTagAction(tagId, false))}
        >
          Отклонить
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="grid size-5 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
      disabled={pending}
      onClick={() => run(() => removePhotoTagAction(tagId))}
      aria-label="Убрать отметку"
      title="Убрать отметку"
    >
      <X className="size-3" />
    </button>
  );
}
