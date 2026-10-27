"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  respondPhotoTagAction,
  removePhotoTagAction,
} from "@/lib/actions/diary";

export function TagActions({
  tagId,
  kind,
}: {
  tagId: string;
  kind: "respond" | "remove";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (kind === "respond") {
    return (
      <span className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-primary !min-h-0 !px-2 !py-1 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await respondPhotoTagAction(tagId, true);
              router.refresh();
            })
          }
        >
          ✔ Принять
        </button>
        <button
          type="button"
          className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await respondPhotoTagAction(tagId, false);
              router.refresh();
            })
          }
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
      onClick={() =>
        startTransition(async () => {
          await removePhotoTagAction(tagId);
          router.refresh();
        })
      }
    >
      Убрать отметку
    </button>
  );
}
