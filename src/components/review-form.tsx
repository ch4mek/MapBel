"use client";

import { useActionState } from "react";
import { upsertReviewAction, type ActionResult } from "@/lib/actions/social";

export function ReviewForm({
  placeId,
  authorized,
  existing,
}: {
  placeId: string;
  authorized: boolean;
  existing?: { rating: number; text: string | null; tips: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    upsertReviewAction,
    {},
  );

  if (!authorized) {
    return (
      <p className="text-sm text-[var(--muted)]">
        <a href="/login" className="text-[var(--brand)] underline">
          Войдите
        </a>
        , чтобы оставить отзыв.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="placeId" value={placeId} />
      <div>
        <label className="label" htmlFor="review-rating">
          Оценка
        </label>
        <select
          id="review-rating"
          name="rating"
          className="input"
          defaultValue={existing?.rating ?? 5}
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {"★".repeat(r)}{"☆".repeat(5 - r)} ({r})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="review-text">
          Впечатления
        </label>
        <textarea
          id="review-text"
          name="text"
          className="input min-h-24"
          maxLength={5000}
          placeholder="Что понравилось, что стоит знать заранее?"
          defaultValue={existing?.text ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="review-tips">
          Практические советы (логистика, парковка, билеты)
        </label>
        <textarea
          id="review-tips"
          name="tips"
          className="input min-h-16"
          maxLength={2000}
          defaultValue={existing?.tips ?? ""}
        />
      </div>
      {state.error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700" role="status">
          Отзыв сохранён.
        </p>
      )}
      <button className="btn btn-primary w-fit" disabled={pending} type="submit">
        {pending ? "Сохраняем…" : existing ? "Обновить отзыв" : "Опубликовать отзыв"}
      </button>
    </form>
  );
}
