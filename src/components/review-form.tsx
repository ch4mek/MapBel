"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleCheck, CircleAlert } from "lucide-react";
import { upsertReviewAction, type ActionResult } from "@/lib/actions/social";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const RATING_WORDS = ["", "Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"];

export function ReviewForm({
  placeId,
  authorized,
  existing,
}: {
  placeId: string;
  authorized: boolean;
  existing?: { rating: number; text: string | null; tips: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(upsertReviewAction, {});
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  if (!authorized) {
    return (
      <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
        <Link href="/login" className="font-semibold text-forest-700 hover:underline">
          Войдите
        </Link>
        , чтобы поделиться впечатлениями о месте.
      </p>
    );
  }

  const shown = hover || rating;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="placeId" value={placeId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="label">Ваша оценка</legend>
        <div className="flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                aria-label={`${i} из 5`}
                aria-pressed={rating === i}
                className="rounded-md p-0.5 transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:outline-none"
              >
                <svg
                  viewBox="0 0 20 20"
                  className={cn("size-8", i <= shown ? "text-amber-400" : "text-zinc-200")}
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7L10 1.6z" />
                </svg>
              </button>
            ))}
          </div>
          <span className="text-sm font-semibold text-zinc-600">{RATING_WORDS[shown]}</span>
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="review-text">
          Впечатления
        </label>
        <textarea
          id="review-text"
          name="text"
          className="input"
          maxLength={5000}
          placeholder="Что понравилось, что удивило?"
          defaultValue={existing?.text ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="review-tips">
          Практические советы
        </label>
        <textarea
          id="review-tips"
          name="tips"
          className="input min-h-16"
          maxLength={2000}
          placeholder="Парковка, билеты, лучшее время для визита…"
          defaultValue={existing?.tips ?? ""}
        />
      </div>
      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      {state.ok && (
        <Alert tone="success" icon={CircleCheck}>
          Отзыв сохранён — спасибо!
        </Alert>
      )}
      <button className="btn btn-primary self-start" disabled={pending || rating === 0} type="submit">
        {pending ? "Сохраняем…" : existing ? "Обновить отзыв" : "Опубликовать отзыв"}
      </button>
    </form>
  );
}
