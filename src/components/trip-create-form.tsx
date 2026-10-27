"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createTripAction, type ActionResult } from "@/lib/actions/social";

// Дефолт даты — на уровне модуля (Date.now недопустим в рендере)
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

export function TripCreateForm({
  places,
  preselectedPlaceId,
}: {
  places: { id: string; name: string; zoneName: string }[];
  preselectedPlaceId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createTripAction,
    {},
  );

  useEffect(() => {
    if (state.ok && state.id) router.push(`/trips/${state.id}`);
  }, [state, router]);

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4">
      <div>
        <label className="label" htmlFor="title">
          Название *
        </label>
        <input id="title" name="title" className="input" required maxLength={120} placeholder="Выходные в Гродно" />
      </div>
      <div>
        <label className="label" htmlFor="tripDate">
          Дата *
        </label>
        <input id="tripDate" name="tripDate" type="date" className="input" required defaultValue={TOMORROW} />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Описание
        </label>
        <textarea id="description" name="description" className="input min-h-20" maxLength={3000} />
      </div>
      <fieldset>
        <legend className="label">Обязательные места маршрута</legend>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Для совместной отметки места нужны подтверждения минимум двух
          участников в окне 2 часа после старта. Поездка без обязательных мест
          не может быть завершена.
        </p>
        <ul className="flex flex-col gap-1.5">
          {places.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id={`place-${p.id}`}
                name="placeIds"
                value={p.id}
                defaultChecked={p.id === preselectedPlaceId}
                className="h-4 w-4"
              />
              <label htmlFor={`place-${p.id}`}>
                {p.name} <span className="text-[var(--muted)]">— {p.zoneName}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {state.error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        {pending ? "Создаём…" : "Создать поездку"}
      </button>
    </form>
  );
}
