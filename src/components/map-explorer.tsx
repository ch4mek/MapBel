"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronUp,
  Compass,
  Info,
  LocateFixed,
  MapPinned,
  Maximize2,
  Navigation,
  Search,
  X,
} from "lucide-react";
import type { MapPlaceDTO, MapZoneDTO } from "@/lib/catalog";
import { PLACE_CATEGORY_LABELS, type PlaceCategoryKey } from "@/lib/place-meta";
import { RANK_LABELS } from "@/lib/ranks";
import { shortZoneName } from "@/lib/format";
import { CategoryBadge, CategoryIcon, CategoryTile } from "@/components/ui/category";
import { RankBadge, RankLadder, RankMedal, RANK_STYLE } from "@/components/ui/rank";
import { Pill, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#e8ebe6]">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-600 shadow-soft">
        <span className="size-4 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" />
        Загружаем карту…
      </div>
    </div>
  ),
});

const CATEGORIES = Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategoryKey[];

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

const DISTRICT_ORDER = [
  "Центральный район",
  "Советский район",
  "Первомайский район",
  "Партизанский район",
  "Заводской район",
  "Ленинский район",
  "Октябрьский район",
  "Московский район",
  "Фрунзенский район",
];

function districtLabel(key: string): string {
  return key.replace(" район", "");
}

type GeoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; accuracy: number }
  | { kind: "error"; message: string };

export function MapExplorer({
  zones,
  places,
  styleUrl,
  isAuthed,
  initialZoneSlug,
}: {
  zones: MapZoneDTO[];
  places: MapPlaceDTO[];
  styleUrl: string;
  isAuthed: boolean;
  initialZoneSlug?: string;
}) {
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategoryKey | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(
    () => zones.find((z) => z.slug === initialZoneSlug)?.id ?? null,
  );
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });
  const [resetSignal, setResetSignal] = useState(0);

  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const place = places.find((p) => p.id === placeId) ?? null;
  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter(
      (p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [places, query, category]);

  const searching = query.trim().length > 0;
  const zonePlaces = zone ? filteredPlaces.filter((p) => p.zoneId === zone.id) : [];

  const totals = useMemo(() => {
    const opened = zones.filter((z) => z.status !== "NONE").length;
    const visited = places.filter((p) => p.visited).length;
    return { opened, visited };
  }, [zones, places]);

  const padding = isDesktop
    ? { top: 40, bottom: 40, left: 460, right: 60 }
    : { top: 130, bottom: sheetOpen ? 380 : 200, left: 30, right: 30 };

  function openZone(id: string) {
    setZoneId(id);
    setPlaceId(null);
    setSheetOpen(true);
  }
  function openPlace(id: string) {
    const p = places.find((x) => x.id === id);
    if (p) setZoneId(p.zoneId);
    setPlaceId(id);
    setSheetOpen(true);
  }
  function back() {
    if (placeId) {
      setPlaceId(null);
      return;
    }
    setZoneId(null);
    setResetSignal((n) => n + 1);
  }
  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo({ kind: "error", message: "Браузер не поддерживает геолокацию" });
      return;
    }
    setGeo({ kind: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeo({ kind: "ok", accuracy: Math.round(pos.coords.accuracy) });
      },
      (err) =>
        setGeo({
          kind: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Доступ к геолокации запрещён в настройках браузера"
              : err.code === err.TIMEOUT
                ? "Не удалось определить позицию: истекло время ожидания"
                : "Геолокация сейчас недоступна",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  useEffect(() => {
    if (geo.kind !== "ok" && geo.kind !== "error") return;
    const t = setTimeout(() => setGeo({ kind: "idle" }), 5000);
    return () => clearTimeout(t);
  }, [geo]);

  const panelTitle = place ? place.name : zone ? zone.name : searching ? "Результаты поиска" : "Обзор";

  const content = (
    <PanelContent
      zones={zones}
      zone={zone}
      place={place}
      zonePlaces={zonePlaces}
      searching={searching}
      results={filteredPlaces}
      zoneById={zoneById}
      totals={totals}
      isAuthed={isAuthed}
      onZone={openZone}
      onPlace={openPlace}
      onBack={back}
    />
  );

  const searchBox = (
    <div className="flex flex-col gap-2.5">
      <label className="relative block">
        <span className="sr-only">Поиск места</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          className="input h-12 rounded-2xl border-zinc-200/80 bg-white pr-10 pl-11 shadow-sm"
          placeholder="Найти замок, музей, тропу…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setSheetOpen(true);
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Очистить поиск"
          >
            <X className="size-4" />
          </button>
        )}
      </label>
      <div
        className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        role="group"
        aria-label="Фильтр по категориям"
      >
        <button
          type="button"
          className={cn("chip shrink-0", category === null && "chip-active")}
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
        >
          Все
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={cn("chip shrink-0", category === c && "chip-active")}
            onClick={() => setCategory(category === c ? null : c)}
            aria-pressed={category === c}
          >
            <CategoryIcon category={c} className="size-3.5" />
            {PLACE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="map-shell relative w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          zones={zones}
          places={filteredPlaces}
          styleUrl={styleUrl}
          selectedZoneId={zoneId}
          selectedPlaceId={placeId}
          onZoneClick={openZone}
          onPlaceClick={openPlace}
          onMapClick={() => setSheetOpen(false)}
          userLocation={userLocation}
          padding={padding}
          resetSignal={resetSignal}
        />
      </div>

      {/* Кнопки управления видом */}
      <div
        className="absolute right-3 z-10 flex flex-col gap-2 transition-[bottom] duration-300 lg:right-5"
        style={{
          bottom: isDesktop ? "1.25rem" : sheetOpen ? "calc(62dvh + 0.75rem)" : "calc(9.5rem + 0.75rem)",
        }}
      >
        <button
          type="button"
          onClick={() => setResetSignal((n) => n + 1)}
          className="glass grid size-11 place-items-center rounded-2xl text-zinc-700 hover:text-forest-700"
          aria-label="Показать всю Беларусь"
          title="Вся Беларусь"
        >
          <Maximize2 className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={locate}
          className="glass grid size-11 place-items-center rounded-2xl text-zinc-700 hover:text-forest-700"
          aria-label="Показать моё положение"
          title="Где я?"
        >
          {geo.kind === "loading" ? (
            <span className="size-4 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" />
          ) : (
            <LocateFixed className="size-[18px]" />
          )}
        </button>
      </div>

      {(geo.kind === "ok" || geo.kind === "error") && (
        <div className="absolute top-3 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 animate-fade-in lg:top-5 lg:left-auto lg:right-20 lg:translate-x-0">
          <div
            role="status"
            className={cn(
              "glass flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium",
              geo.kind === "error" ? "text-red-700" : "text-zinc-800",
            )}
          >
            {geo.kind === "error" ? <Info className="size-4 shrink-0" /> : <Navigation className="size-4 shrink-0 text-blue-600" />}
            {geo.kind === "error" ? geo.message : `Позиция определена · точность ~${geo.accuracy} м`}
          </div>
        </div>
      )}

      {/* Десктоп: плавающая панель слева */}
      <aside
        className="glass absolute top-4 bottom-4 left-4 z-10 hidden w-[420px] flex-col overflow-hidden rounded-3xl lg:flex"
        aria-label="Зоны и места"
      >
        <div className="border-b border-zinc-100 p-4">{searchBox}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </aside>

      {/* Мобильные: поиск сверху и шторка снизу */}
      <div className="absolute inset-x-3 top-3 z-10 lg:hidden">{searchBox}</div>

      <section
        className={cn(
          "glass absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl transition-[height] duration-300 ease-out lg:hidden",
          sheetOpen ? "h-[62dvh]" : "h-[9.5rem]",
        )}
        aria-label={panelTitle}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className="flex w-full shrink-0 flex-col items-center gap-1.5 px-5 pt-2.5 pb-1"
          aria-expanded={sheetOpen}
          aria-label={sheetOpen ? "Свернуть панель" : "Развернуть панель"}
        >
          <span className="h-1.5 w-11 rounded-full bg-zinc-300" />
          <span className="flex w-full items-center justify-between gap-2 text-left">
            <span className="truncate font-display text-[15px] font-semibold">{panelTitle}</span>
            <ChevronUp className={cn("size-5 shrink-0 text-zinc-400 transition", sheetOpen && "rotate-180")} />
          </span>
        </button>
        <div className={cn("min-h-0 flex-1", sheetOpen ? "overflow-y-auto" : "overflow-hidden")}>{content}</div>
      </section>
    </div>
  );
}

function PanelContent(props: {
  zones: MapZoneDTO[];
  zone: MapZoneDTO | null;
  place: MapPlaceDTO | null;
  zonePlaces: MapPlaceDTO[];
  searching: boolean;
  results: MapPlaceDTO[];
  zoneById: Map<string, MapZoneDTO>;
  totals: { opened: number; visited: number };
  isAuthed: boolean;
  onZone: (id: string) => void;
  onPlace: (id: string) => void;
  onBack: () => void;
}) {
  const { zone, place } = props;

  if (place) {
    const z = props.zoneById.get(place.zoneId);
    return (
      <div className="animate-fade-in p-4">
        <BackButton onClick={props.onBack}>{z ? shortZoneName(z.name) : "Назад"}</BackButton>
        <div className="mt-3 flex items-start gap-3">
          <CategoryTile category={place.category} className="size-14" />
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-snug font-bold text-zinc-900">{place.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <CategoryBadge category={place.category} size="sm" />
              {place.visited && (
                <Pill tone="success" icon={Check} className="py-0.5 text-[11px]">
                  Посещено
                </Pill>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{place.shortDescription}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/places/${place.slug}`} className="btn btn-primary">
            Подробнее
            <ArrowRight className="size-4" />
          </Link>
          <a
            href={`https://yandex.by/maps/?rtext=~${place.lat},${place.lon}&rtt=auto`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            <Navigation className="size-4" />
            Маршрут
          </a>
        </div>
        {!props.isAuthed && (
          <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">
            <Link href="/register" className="font-semibold text-forest-700 underline-offset-2 hover:underline">
              Зарегистрируйтесь
            </Link>
            , чтобы отмечать посещения и открывать зоны.
          </p>
        )}
      </div>
    );
  }

  if (zone) {
    const goldAvailable = zone.goldMinCount > 0 && zone.publishedPlaces > 0;
    return (
      <div className="animate-fade-in p-4">
        <BackButton onClick={props.onBack}>Все зоны</BackButton>
        <div className="mt-3 flex items-start gap-3">
          <RankMedal rank={zone.status} className="size-14" />
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-snug font-bold text-zinc-900">{zone.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <RankBadge rank={zone.status} size="sm" />
              {zone.district && (
                <Pill className="py-0.5 text-[11px]">{zone.district}</Pill>
              )}
              {zone.isDemo && (
                <Pill tone="demo" className="py-0.5 text-[11px]">
                  Демо-зона
                </Pill>
              )}
            </div>
          </div>
        </div>
        {zone.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{zone.description}</p>
        )}

        {zone.publishedPlaces === 0 ? (
          <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
            Задания для этой зоны готовятся.
          </div>
        ) : (
          <>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="text-zinc-700">Исследовано</span>
                <span className="text-zinc-500">
                  {zone.uniquePlaces} из {zone.publishedPlaces} мест
                </span>
              </div>
              <ProgressBar value={zone.uniquePlaces} max={zone.publishedPlaces} label="Прогресс зоны" />
            </div>
            <div className="mt-4">
              <RankLadder
                rank={zone.status}
                uniquePlaces={zone.uniquePlaces}
                silverThreshold={zone.silverThreshold}
                goldMinCount={zone.goldMinCount}
                goldAvailable={goldAvailable}
              />
            </div>
          </>
        )}

        <h3 className="mt-5 mb-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Места зоны · {props.zonePlaces.length}
        </h3>
        <PlaceList places={props.zonePlaces} onPlace={props.onPlace} />
      </div>
    );
  }

  if (props.searching) {
    return (
      <div className="animate-fade-in p-4">
        <h3 className="mb-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Найдено мест · {props.results.length}
        </h3>
        {props.results.length === 0 ? (
          <p className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
            Ничего не нашли. Попробуйте другое название или сбросьте фильтр категорий.
          </p>
        ) : (
          <PlaceList places={props.results} onPlace={props.onPlace} zoneById={props.zoneById} />
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 p-4 text-white">
        <Compass className="absolute -top-4 -right-4 size-28 text-white/10" aria-hidden />
        <p className="text-xs font-semibold tracking-wider text-forest-200 uppercase">
          {props.isAuthed ? "Ваша карта открытий" : "Карта открытий"}
        </p>
        {props.isAuthed ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="font-display text-2xl font-bold">
                {props.totals.opened}
                <span className="text-base text-white/60">/{props.zones.length}</span>
              </div>
              <div className="text-xs text-white/70">зон открыто</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{props.totals.visited}</div>
              <div className="text-xs text-white/70">мест посещено</div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
              Приезжайте на место, нажмите «Я здесь» — и зона откроется. Бронза, серебро, золото.
            </p>
            <Link href="/register" className="btn btn-sm mt-3 bg-white text-forest-800 hover:bg-forest-50">
              Начать путешествие
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[11px] font-medium text-zinc-500" aria-label="Легенда">
        {(["NONE", "BRONZE", "SILVER", "GOLD"] as const).map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: RANK_STYLE[r].hex }} />
            {RANK_LABELS[r]}
          </span>
        ))}
      </div>

      <h3 className="mt-5 mb-2 flex items-center justify-between text-xs font-bold tracking-wider text-zinc-400 uppercase">
        <span>Игровые зоны · {props.zones.length}</span>
      </h3>
      {groupedByDistrict(props.zones).map(([district, list]) => (
        <div key={district} className="mb-3">
          <div className="mb-1 px-1 text-[11px] font-bold tracking-wide text-zinc-500">
            {districtLabel(district)}
          </div>
          <ul className="flex flex-col gap-1.5">
            {list.map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  onClick={() => props.onZone(z.id)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-2.5 text-left transition hover:border-zinc-200 hover:bg-white"
                >
                  <RankMedal rank={z.status} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-900">
                      {shortZoneName(z.name)}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <ProgressBar value={z.uniquePlaces} max={Math.max(1, z.publishedPlaces)} className="h-1.5" />
                      <span className="shrink-0 text-[11px] font-medium text-zinc-500">
                        {z.uniquePlaces}/{z.publishedPlaces}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-4 flex gap-2 rounded-xl bg-amber-50/80 p-3 text-[11px] leading-relaxed text-amber-900">
        <MapPinned className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Сейчас доступны демонстрационные зоны в разных частях страны. Полное покрытие Беларуси — в работе.
      </p>
    </div>
  );
}

function groupedByDistrict(zones: MapZoneDTO[]): [string, MapZoneDTO[]][] {
  const groups = new Map<string, MapZoneDTO[]>();
  for (const z of zones) {
    const key = z.district ?? "Другие зоны";
    const list = groups.get(key) ?? [];
    list.push(z);
    groups.set(key, list);
  }
  const ordered: [string, MapZoneDTO[]][] = [];
  for (const d of DISTRICT_ORDER) {
    if (groups.has(d)) ordered.push([d, groups.get(d)!]);
  }
  for (const [key, list] of groups) {
    if (!DISTRICT_ORDER.includes(key)) ordered.push([key, list]);
  }
  return ordered;
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1.5 inline-flex h-8 max-w-full items-center gap-1 rounded-lg px-1.5 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    >
      <ArrowLeft className="size-4 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function zoneZoneLabel(zoneById: Map<string, MapZoneDTO> | undefined, p: MapPlaceDTO): string {
  const z = zoneById?.get(p.zoneId);
  return z ? shortZoneName(z.name) : PLACE_CATEGORY_LABELS[p.category];
}

function PlaceList({
  places,
  onPlace,
  zoneById,
}: {
  places: MapPlaceDTO[];
  onPlace: (id: string) => void;
  zoneById?: Map<string, MapZoneDTO>;
}) {
  if (places.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
        Нет мест по выбранному фильтру.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {places.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onPlace(p.id)}
            className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white"
          >
            <span className="relative">
              <CategoryTile category={p.category} className="size-10" />
              {p.visited && (
                <span className="absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                  <Check className="size-2.5" strokeWidth={3.5} aria-label="посещено" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-zinc-900">{p.name}</span>
              <span className="block truncate text-xs text-zinc-500">
                {zoneZoneLabel(zoneById, p)}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
          </button>
        </li>
      ))}
    </ul>
  );
}
