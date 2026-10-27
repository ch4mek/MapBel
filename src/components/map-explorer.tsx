"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MapPlaceDTO, MapZoneDTO } from "@/lib/catalog";
import {
  PLACE_CATEGORY_ICONS,
  PLACE_CATEGORY_LABELS,
  type PlaceCategoryKey,
} from "@/lib/place-meta";
import { RANK_ICONS, RANK_LABELS } from "@/lib/ranks";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border bg-[#dfe7ec] text-sm text-[var(--muted)]">
      Загружаем карту…
    </div>
  ),
});

const LEGEND = [
  { icon: "🔒", label: "Не открыто", color: "#9aa5ae" },
  { icon: "🥉", label: "Бронза", color: "#c98a3d" },
  { icon: "🥈", label: "Серебро", color: "#8fa1b3" },
  { icon: "🥇", label: "Золото", color: "#d8b013" },
];

const CATEGORIES = Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategoryKey[];

export function MapExplorer({
  zones,
  places,
  styleUrl,
}: {
  zones: MapZoneDTO[];
  places: MapPlaceDTO[];
  styleUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategoryKey | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceDTO | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q)),
    );
  }, [places, query, category]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;
  const zonePlaces = selectedZone
    ? filteredPlaces.filter((p) => p.zoneId === selectedZone.id)
    : [];

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoMessage("Геолокация недоступна в этом браузере");
      return;
    }
    setGeoMessage("Определяем позицию…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoMessage(
          `Позиция получена (точность ~${Math.round(pos.coords.accuracy)} м)`,
        );
      },
      (err) => {
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? "Доступ к геолокации отклонён. Разрешите его в настройках браузера"
            : err.code === err.TIMEOUT
              ? "Не удалось получить позицию: тайм-аут. Попробуйте ещё раз"
              : "Геолокация недоступна",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* Панель управления и списки */}
      <section className="flex flex-col gap-3" aria-label="Зоны и фильтры">
        <div className="card p-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Легенда статусов зон">
            {LEGEND.map((l) => (
              <span key={l.label} className="chip">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: l.color }}
                />
                {l.icon} {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-3">
          <label className="label" htmlFor="place-search">
            Поиск места
          </label>
          <input
            id="place-search"
            className="input"
            type="search"
            placeholder="Например: Мирский замок"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Фильтр по категориям">
            <button
              className={`chip ${category === null ? "chip-active" : ""}`}
              onClick={() => setCategory(null)}
              type="button"
            >
              Все категории
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? "chip-active" : ""}`}
                onClick={() => setCategory(category === c ? null : c)}
                type="button"
              >
                {PLACE_CATEGORY_ICONS[c]} {PLACE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col divide-y p-1">
          <div className="px-2 pt-2 pb-1 text-sm font-semibold">
            Зоны ({zones.length})
          </div>
          {zones.length === 0 && (
            <p className="p-3 text-sm text-[var(--muted)]">
              Зоны ещё не добавлены.
            </p>
          )}
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                z.id === selectedZoneId ? "bg-emerald-50" : ""
              }`}
              onClick={() => {
                setSelectedZoneId(z.id);
                setSelectedPlace(null);
              }}
            >
              <span aria-hidden className="text-lg">
                {RANK_ICONS[z.status]}
              </span>
              <span className="flex-1">
                <span className="block font-medium leading-tight">{z.name}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {RANK_LABELS[z.status]} · мест {z.publishedPlaces}
                  {z.status !== "NONE" ? ` · открыто ${z.uniquePlaces}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="card p-3">
          <button className="btn btn-ghost w-full" type="button" onClick={locateMe}>
            📍 Показать моё положение
          </button>
          {geoMessage && (
            <p className="mt-2 text-xs text-[var(--muted)]" role="status">
              {geoMessage}
            </p>
          )}
        </div>
      </section>

      {/* Карта и карточки */}
      <section className="flex flex-col gap-4" aria-label="Карта">
        <div className="h-[46dvh] lg:h-[560px]">
          <MapView
            zones={zones}
            places={filteredPlaces}
            styleUrl={styleUrl}
            selectedZoneId={selectedZoneId}
            focusPlace={selectedPlace}
            onZoneClick={(id) => {
              setSelectedZoneId(id);
              setSelectedPlace(null);
            }}
            onPlaceClick={(p) => setSelectedPlace(p)}
            userLocation={userLocation}
          />
        </div>

        {selectedPlace && (
          <div className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {PLACE_CATEGORY_ICONS[selectedPlace.category]}{" "}
                  {selectedPlace.name}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  {PLACE_CATEGORY_LABELS[selectedPlace.category]} ·{" "}
                  {zones.find((z) => z.id === selectedPlace.zoneId)?.name}
                </p>
              </div>
              {selectedPlace.visited && (
                <span className="chip !border-emerald-600 !text-emerald-700">
                  ✔ посещено
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/places/${selectedPlace.slug}`} className="btn btn-primary">
                Открыть карточку
              </Link>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setSelectedPlace(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {selectedZone && (
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {RANK_ICONS[selectedZone.status]} {selectedZone.name}
              </h2>
              <span className="chip">{RANK_LABELS[selectedZone.status]}</span>
              {selectedZone.isDemo && (
                <span className="chip !border-amber-500 !text-amber-700">
                  демо-зона
                </span>
              )}
            </div>
            {selectedZone.description && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {selectedZone.description}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[var(--muted)]">Открыто мест</dt>
                <dd className="font-semibold">
                  {selectedZone.uniquePlaces} / {selectedZone.publishedPlaces}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Серебро с</dt>
                <dd className="font-semibold">{selectedZone.silverThreshold} мест</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Золото</dt>
                <dd className="font-semibold">
                  {selectedZone.goldMinCount > 0
                    ? `${selectedZone.goldMinCount} мест + подборка (${selectedZone.goldRequiredCount})`
                    : "задания готовятся"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Статус</dt>
                <dd className="font-semibold">
                  {selectedZone.publishedPlaces === 0
                    ? "Задания готовятся"
                    : RANK_LABELS[selectedZone.status]}
                </dd>
              </div>
            </dl>

            <h3 className="mt-4 text-sm font-semibold">
              Места в зоне ({zonePlaces.length})
            </h3>
            <ul className="mt-1 flex flex-col gap-1">
              {zonePlaces.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{p.visited ? "✅" : "◻️"}</span>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => setSelectedPlace(p)}
                  >
                    {PLACE_CATEGORY_ICONS[p.category]} {p.name}
                  </button>
                </li>
              ))}
              {zonePlaces.length === 0 && (
                <li className="text-sm text-[var(--muted)]">
                  В зоне пока нет опубликованных мест. Задания готовятся.
                </li>
              )}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
