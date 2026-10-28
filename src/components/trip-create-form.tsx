"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Search } from "lucide-react";
import { createTripAction, type ActionResult } from "@/lib/actions/social";
import { Alert } from "@/components/ui/primitives";
import { CategoryTile } from "@/components/ui/category";
import type { PlaceCategoryKey } from "@/lib/place-meta";
import { cn } from "@/lib/cn";

// Дефолт даты — на уровне модуля (Date.now недопустим в рендере)
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

export function TripCreateForm({
  places,
  preselectedPlaceId,
}: {
  places: { id: string; name: string; zoneName: string; category: PlaceCategoryKey }[];
  preselectedPlaceId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createTripAction, {});
  const [selected, setSelected] = useState<string[]>(preselectedPlaceId ? [preselectedPlaceId] : []);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (state.ok && state.id) router.push(`/trips/${state.id}`);
  }, [state, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? places.filter((p) => p.name.toLowerCase().includes(q) || p.zoneName.toLowerCase().includes(q))
      : places;
  }, [places, query]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const byId = new Map(places.map((p) => [p.id, p]));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {selected.map((id) => (
        <input key={id} type="hidden" name="placeIds" value={id} />
      ))}
      <div>
        <label className="label" htmlFor="title">
          Название
        </label>
        <input
          id="title"
          name="title"
          className="input h-12 text-base"
          required
          maxLength={120}
          placeholder="Выходные в Гродно"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tripDate">
            Дата
          </label>
          <input id="tripDate" name="tripDate" type="date" className="input" required defaultValue={TOMORROW} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          className="input"
          maxLength={3000}
          placeholder="Сбор, транспорт, что взять с собой…"
        />
      </div>

      <fieldset>
        <legend className="label">Маршрут · {selected.length} мест</legend>
        <p className="hint mb-3">
          Место станет совместным, когда минимум двое участников отметятся на нём в пределах 2 часов после
          старта поездки.
        </p>

        {selected.length > 0 && (
          <ol className="mb-3 flex flex-col gap-1.5">
            {selected.map((id, i) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <li key={id} className="flex items-center gap-3 rounded-xl bg-forest-50 px-3 py-2 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-forest-700 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-forest-900">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="text-xs font-semibold text-forest-700 hover:underline"
                  >
                    Убрать
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <label className="relative mb-2 block">
          <span className="sr-only">Найти место</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="input h-10 pl-9"
            placeholder="Найти место или зону"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ul className="max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 p-1.5">
          {filtered.map((p) => {
            const on = selected.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                    on ? "bg-forest-50" : "hover:bg-zinc-50",
                  )}
                >
                  <CategoryTile category={p.category} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{p.zoneName}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
                      on ? "border-forest-700 bg-forest-700 text-white" : "border-zinc-300",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-3 text-sm text-zinc-500">Ничего не найдено</li>}
        </ul>
      </fieldset>

      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      <button className="btn btn-primary btn-lg self-start" type="submit" disabled={pending}>
        {pending ? "Создаём…" : "Создать поездку"}
      </button>
    </form>
  );
}
