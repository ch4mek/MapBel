"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resolveSuggestionAction,
  moderateReviewAction,
  setPlacePublicationAction,
} from "@/lib/actions/editor";

export function SuggestionActions({ suggestionId }: { suggestionId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve(decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await resolveSuggestionAction(suggestionId, decision, comment);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        className="input !max-w-64 !min-h-0 !py-1.5 text-xs"
        placeholder="Комментарий редактора"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary !min-h-0 !px-2 !py-1 text-xs"
        disabled={pending}
        onClick={() => resolve("APPROVED")}
      >
        Одобрить
      </button>
      <button
        type="button"
        className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
        disabled={pending}
        onClick={() => resolve("REJECTED")}
      >
        Отклонить
      </button>
      {error && (
        <span className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function ReviewModerate({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await moderateReviewAction(reviewId, !hidden);
          router.refresh();
        })
      }
    >
      {hidden ? "Вернуть" : "Скрыть"}
    </button>
  );
}

export function PlaceVisibility({
  placeId,
  status,
}: {
  placeId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";
  return (
    <button
      type="button"
      className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setPlacePublicationAction(placeId, next);
          router.refresh();
        })
      }
    >
      {status === "PUBLISHED" ? "Скрыть" : status === "HIDDEN" ? "Опубликовать" : "В черновики → опубликовать"}
    </button>
  );
}
