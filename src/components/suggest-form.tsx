"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck, LocateFixed, MapPinPlus, Pencil } from "lucide-react";
import { createSuggestionAction, type ActionResult } from "@/lib/actions/social";
import { PLACE_CATEGORY_LABELS, type PlaceCategoryKey } from "@/lib/place-meta";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const CATEGORIES = Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategoryKey[];

export function SuggestForm({
  zones,
  places,
  preselectedPlaceId,
}: {
  zones: { id: string; name: string }[];
  places: { id: string; name: string; zoneName: string }[];
  preselectedPlaceId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createSuggestionAction, {});
  const [type, setType] = useState<"NEW_PLACE" | "CORRECTION">(preselectedPlaceId ? "CORRECTION" : "NEW_PLACE");
  const [coords, setCoords] = useState({ lat: "", lon: "" });
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  function useMyPosition() {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Браузер не поддерживает геолокацию");
      return;
    }
    setGeoMsg("Определяем позицию…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) });
        setGeoMsg(null);
      },
      () => setGeoMsg("Не удалось определить позицию — введите координаты вручную"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  if (state.ok) {
    return (
      <div className="animate-pop flex flex-col items-center py-6 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-forest-50 text-forest-700">
          <CircleCheck className="size-8" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold">Спасибо!</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Предложение отправлено редакторам. Оно появится в каталоге только после проверки.
        </p>
        <a href="/suggest" className="btn btn-secondary btn-sm mt-5">
          Предложить ещё
        </a>
      </div>
    );
  }

  const byZone = new Map<string, { id: string; name: string }[]>();
  for (const p of places) {
    const list = byZone.get(p.zoneName) ?? [];
    list.push(p);
    byZone.set(p.zoneName, list);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тип предложения">
        {[
          { value: "NEW_PLACE" as const, icon: MapPinPlus, title: "Новое место", text: "Его ещё нет на карте" },
          { value: "CORRECTION" as const, icon: Pencil, title: "Исправление", text: "Ошибка в данных места" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={type === o.value}
            onClick={() => setType(o.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition",
              type === o.value ? "border-forest-600 bg-forest-50" : "border-zinc-200 bg-white hover:border-zinc-300",
            )}
          >
            <o.icon className="size-5 text-forest-700" />
            <span className="mt-1 text-sm font-semibold">{o.title}</span>
            <span className="text-xs text-zinc-500">{o.text}</span>
          </button>
        ))}
      </div>

      {type === "CORRECTION" && (
        <div>
          <label className="label" htmlFor="targetPlaceId">
            Какое место исправить
          </label>
          <select
            id="targetPlaceId"
            name="targetPlaceId"
            className="input"
            required
            defaultValue={preselectedPlaceId ?? ""}
          >
            <option value="" disabled>
              Выберите место
            </option>
            {[...byZone.entries()].map(([zone, list]) => (
              <optgroup key={zone} label={zone}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="hint">Заполните только те поля, которые нужно изменить.</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Название
          </label>
          <input
            id="name"
            name="name"
            className="input"
            maxLength={120}
            required={type === "NEW_PLACE"}
            placeholder="Например: Усадьба Огинских"
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Категория
          </label>
          <select id="category" name="category" className="input" defaultValue="" required={type === "NEW_PLACE"}>
            <option value="">{type === "NEW_PLACE" ? "Выберите категорию" : "Без изменений"}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PLACE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "NEW_PLACE" && (
        <div>
          <label className="label" htmlFor="zoneId">
            Зона
          </label>
          <select id="zoneId" name="zoneId" className="input" defaultValue="" required>
            <option value="" disabled>
              В какой зоне находится место
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="description">
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          className="input"
          maxLength={5000}
          required={type === "NEW_PLACE"}
          placeholder="Что это за место и чем оно интересно"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="label mb-0">Координаты</span>
          <button type="button" onClick={useMyPosition} className="btn btn-subtle btn-sm -mr-2">
            <LocateFixed className="size-3.5" />
            Я сейчас здесь
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="lat"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            className="input"
            placeholder="Широта, 53.4525"
            aria-label="Широта"
            required={type === "NEW_PLACE"}
            value={coords.lat}
            onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
          />
          <input
            name="lon"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            className="input"
            placeholder="Долгота, 26.4725"
            aria-label="Долгота"
            required={type === "NEW_PLACE"}
            value={coords.lon}
            onChange={(e) => setCoords((c) => ({ ...c, lon: e.target.value }))}
          />
        </div>
        {geoMsg && <p className="hint">{geoMsg}</p>}
      </div>

      <div>
        <label className="label" htmlFor="note">
          Комментарий для редактора
        </label>
        <textarea
          id="note"
          name="note"
          className="input min-h-16"
          maxLength={2000}
          placeholder="Источник сведений, ссылка на официальный сайт…"
        />
      </div>

      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      <button className="btn btn-primary btn-lg self-start" type="submit" disabled={pending}>
        {pending ? "Отправляем…" : "Отправить на проверку"}
      </button>
    </form>
  );
}
