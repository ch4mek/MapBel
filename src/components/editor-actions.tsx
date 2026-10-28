"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Eye, EyeOff, X } from "lucide-react";
import {
  resolveSuggestionAction,
  moderateReviewAction,
  setPlacePublicationAction,
} from "@/lib/actions/editor";
import { Alert } from "@/components/ui/primitives";

export function SuggestionActions({ suggestionId }: { suggestionId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve(decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await resolveSuggestionAction(suggestionId, decision, comment || undefined);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input h-10"
          placeholder="Комментарий для автора (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-label="Комментарий редактора"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn btn-primary h-10 flex-1 sm:flex-none"
            disabled={pending}
            onClick={() => resolve("APPROVED")}
          >
            <Check className="size-4" />
            Одобрить
          </button>
          <button
            type="button"
            className="btn btn-secondary h-10 flex-1 sm:flex-none"
            disabled={pending}
            onClick={() => resolve("REJECTED")}
          >
            <X className="size-4" />
            Отклонить
          </button>
        </div>
      </div>
      {error && (
        <Alert tone="danger" icon={CircleAlert} className="mt-3">
          {error}
        </Alert>
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
      className={hidden ? "btn btn-secondary btn-sm" : "btn btn-danger-soft btn-sm"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await moderateReviewAction(reviewId, !hidden);
          router.refresh();
        })
      }
    >
      {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {hidden ? "Вернуть" : "Скрыть"}
    </button>
  );
}

export function PlaceVisibility({ placeId, status }: { placeId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const publish = status !== "PUBLISHED";
  return (
    <button
      type="button"
      className={publish ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setPlacePublicationAction(placeId, publish ? "PUBLISHED" : "HIDDEN");
          router.refresh();
        })
      }
    >
      {publish ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {publish ? "Опубликовать" : "Скрыть"}
    </button>
  );
}
