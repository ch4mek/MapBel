"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent, PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createElement,
  Castle,
  Footprints,
  Landmark,
  Lock,
  Medal,
  ScrollText,
  Sparkles,
  Trees,
  Trophy,
  UtensilsCrossed,
  type IconNode,
} from "lucide";
import type { MapPlaceDTO, MapZoneDTO } from "@/lib/catalog";
import type { PlaceCategoryKey } from "@/lib/place-meta";
import { MAP_DEFAULTS } from "@/config/game";

const BELARUS_BOUNDS: [[number, number], [number, number]] = [
  [23.1, 51.25],
  [32.8, 56.2],
];

/** С этого масштаба вместо меток зон показываются отдельные места. */
const PLACES_ZOOM = 9.2;

const STATUS_FILL: Record<string, string> = {
  NONE: "#94a3b8",
  BRONZE: "#c98a4b",
  SILVER: "#8a9bb0",
  GOLD: "#e0aa16",
};
const STATUS_LINE: Record<string, string> = {
  NONE: "#64748b",
  BRONZE: "#8f5323",
  SILVER: "#4b596b",
  GOLD: "#a37406",
};

const CATEGORY_ICON_NODE: Record<PlaceCategoryKey, IconNode> = {
  HISTORIC: ScrollText,
  MUSEUM: Landmark,
  CASTLE: Castle,
  NATURE: Trees,
  ECOTRAIL: Footprints,
  GASTRO: UtensilsCrossed,
  UNUSUAL: Sparkles,
};
const CATEGORY_HEX: Record<PlaceCategoryKey, string> = {
  HISTORIC: "#b45309",
  MUSEUM: "#6d28d9",
  CASTLE: "#be123c",
  NATURE: "#047857",
  ECOTRAIL: "#4d7c0f",
  GASTRO: "#c2410c",
  UNUSUAL: "#0369a1",
};

function icon(node: IconNode, size: number): SVGElement {
  return createElement(node, { width: size, height: size, "stroke-width": 2.2 });
}

function shortZoneName(name: string): string {
  return name.split(" — ")[0];
}

function zoneBounds(zone: MapZoneDTO): [[number, number], [number, number]] {
  const geom = zone.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** Подписи подложки на русском (с откатом на белорусский и исходное имя). */
function localizeLabels(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue;
    const tf = map.getLayoutProperty(layer.id, "text-field");
    if (!tf || !JSON.stringify(tf).includes("name")) continue;
    map.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", "name:ru"],
      ["get", "name:be"],
      ["get", "name"],
    ]);
  }
}

export interface MapViewProps {
  zones: MapZoneDTO[];
  places: MapPlaceDTO[];
  styleUrl: string;
  selectedZoneId: string | null;
  selectedPlaceId: string | null;
  onZoneClick: (zoneId: string) => void;
  onPlaceClick: (placeId: string) => void;
  onMapClick?: () => void;
  userLocation: { lat: number; lon: number } | null;
  padding: PaddingOptions;
  resetSignal?: number;
}

type MarkerEntry = { marker: maplibregl.Marker; el: HTMLElement };

export default function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const zoneMarkers = useRef(new Map<string, MarkerEntry>());
  const placeMarkers = useRef(new Map<string, MarkerEntry>());
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const latest = useRef(props);
  const styleEverLoaded = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = props;
  });

  // Инициализация карты — один раз
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    // StrictMode перемонтирует компонент с сохранённым состоянием:
    // готовность привязываем к текущему экземпляру карты заново
    styleEverLoaded.current = false;
    const map = new maplibregl.Map({
      container,
      style: props.styleUrl,
      bounds: BELARUS_BOUNDS,
      fitBoundsOptions: { padding: props.padding },
      minZoom: MAP_DEFAULTS.minZoom - 1,
      maxZoom: MAP_DEFAULTS.maxZoom,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const syncZoomClass = () => {
      container.classList.toggle("map-zoomed-in", map.getZoom() >= PLACES_ZOOM);
    };

    map.on("load", () => {
      styleEverLoaded.current = true;
      setFailed(false);
      localizeLabels(map);
      map.addSource("zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const firstSymbol = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
      map.addLayer(
        {
          id: "zone-fill",
          type: "fill",
          source: "zones",
          paint: {
            "fill-color": [
              "match",
              ["get", "status"],
              "GOLD",
              STATUS_FILL.GOLD,
              "SILVER",
              STATUS_FILL.SILVER,
              "BRONZE",
              STATUS_FILL.BRONZE,
              STATUS_FILL.NONE,
            ],
            "fill-opacity": ["match", ["get", "status"], "NONE", 0.16, 0.28],
          },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: "zone-outline",
          type: "line",
          source: "zones",
          paint: {
            "line-color": [
              "match",
              ["get", "status"],
              "GOLD",
              STATUS_LINE.GOLD,
              "SILVER",
              STATUS_LINE.SILVER,
              "BRONZE",
              STATUS_LINE.BRONZE,
              STATUS_LINE.NONE,
            ],
            "line-width": 1.6,
            "line-dasharray": [2, 1.5],
          },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: "zone-selected",
          type: "line",
          source: "zones",
          filter: ["==", ["get", "zoneId"], ""],
          paint: { "line-color": "#185e43", "line-width": 3.5 },
        },
        firstSymbol,
      );
      syncZoomClass();
      setReady(true);
    });

    map.on("error", () => {
      // Стиль не смог загрузиться (тайлы при этом могут доезжать с повторами) —
      // показываем понятное сообщение только если load так и не наступил
      if (!styleEverLoaded.current) setFailed(true);
    });
    map.on("zoom", syncZoomClass);
    map.on("click", "zone-fill", (e: MapLayerMouseEvent) => {
      const zoneId = e.features?.[0]?.properties?.zoneId;
      if (typeof zoneId === "string") latest.current.onZoneClick(zoneId);
    });
    map.on("click", (e) => {
      if (!map.getLayer("zone-fill")) return;
      const hit = map.queryRenderedFeatures(e.point, { layers: ["zone-fill"] });
      if (hit.length === 0) latest.current.onMapClick?.();
    });
    map.on("mouseenter", "zone-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "zone-fill", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    const zm = zoneMarkers.current;
    const pm = placeMarkers.current;
    return () => {
      zm.clear();
      pm.clear();
      userMarker.current = null;
      // сбрасываем готовность: при повторном монтировании карта создаётся с нуля,
      // и эффекты не должны трогать стиль до её load
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Полигоны и метки зон
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("zones") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: props.zones.map((z) => ({
        type: "Feature" as const,
        geometry: z.geometry as GeoJSON.Polygon,
        properties: { zoneId: z.id, status: z.status },
      })),
    });

    for (const { marker } of zoneMarkers.current.values()) marker.remove();
    zoneMarkers.current.clear();
    for (const z of props.zones) {
      const el = document.createElement("div");
      el.className = "zone-marker";
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "zone-pill";
      pill.dataset.rank = z.status;
      pill.setAttribute("aria-label", `Зона ${z.name}`);
      const ic = document.createElement("span");
      ic.className = "zone-pill-icon";
      ic.appendChild(icon(z.status === "NONE" ? Lock : z.status === "GOLD" ? Trophy : Medal, 13));
      const label = document.createElement("span");
      label.textContent = shortZoneName(z.name);
      pill.append(ic, label);
      pill.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onZoneClick(z.id);
      });
      el.appendChild(pill);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([z.centerLon, z.centerLat])
        .addTo(map);
      zoneMarkers.current.set(z.id, { marker, el: pill });
    }
    for (const [id, { el }] of zoneMarkers.current) {
      el.classList.toggle("is-selected", id === latest.current.selectedZoneId);
    }
  }, [props.zones, ready]);

  // Метки мест
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const { marker } of placeMarkers.current.values()) marker.remove();
    placeMarkers.current.clear();
    for (const p of props.places) {
      const el = document.createElement("div");
      el.className = "place-marker";
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "place-pin" + (p.visited ? " is-visited" : "");
      pin.style.setProperty("--c", CATEGORY_HEX[p.category]);
      pin.title = p.name;
      pin.setAttribute("aria-label", p.name + (p.visited ? " (посещено)" : ""));
      pin.appendChild(icon(CATEGORY_ICON_NODE[p.category], 17));
      pin.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onPlaceClick(p.id);
      });
      el.appendChild(pin);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .addTo(map);
      placeMarkers.current.set(p.id, { marker, el: pin });
    }
    for (const [id, { el }] of placeMarkers.current) {
      el.classList.toggle("is-selected", id === latest.current.selectedPlaceId);
    }
  }, [props.places, ready]);

  // Выделенная зона
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("zone-selected")) {
      map.setFilter("zone-selected", ["==", ["get", "zoneId"], props.selectedZoneId ?? ""]);
    }
    for (const [id, { el }] of zoneMarkers.current) {
      el.classList.toggle("is-selected", id === props.selectedZoneId);
    }
    const zone = latest.current.zones.find((z) => z.id === props.selectedZoneId);
    if (zone && !latest.current.selectedPlaceId) {
      map.fitBounds(zoneBounds(zone), {
        padding: latest.current.padding,
        maxZoom: 13.5,
        duration: 900,
      });
    }
  }, [props.selectedZoneId, ready]);

  // Выделенное место
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const [id, { el }] of placeMarkers.current) {
      el.classList.toggle("is-selected", id === props.selectedPlaceId);
    }
    const place = latest.current.places.find((p) => p.id === props.selectedPlaceId);
    if (place) {
      map.flyTo({
        center: [place.lon, place.lat],
        zoom: Math.max(map.getZoom(), 14),
        padding: latest.current.padding,
        duration: 900,
      });
    }
  }, [props.selectedPlaceId, ready]);

  // Сброс вида на всю страну
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.resetSignal) return;
    map.fitBounds(BELARUS_BOUNDS, { padding: latest.current.padding, duration: 900 });
  }, [props.resetSignal, ready]);

  // Позиция пользователя
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.userLocation) return;
    const lngLat: [number, number] = [props.userLocation.lon, props.userLocation.lat];
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "user-dot";
      el.setAttribute("aria-label", "Ваше положение");
      userMarker.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    } else {
      userMarker.current.setLngLat(lngLat);
    }
    map.flyTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 11),
      padding: latest.current.padding,
      duration: 900,
    });
  }, [props.userLocation, ready]);

  return (
    <div className="relative h-full w-full bg-[#e8ebe6]">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Карта Беларуси с игровыми зонами и местами"
      />
      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-600 shadow-soft">
            <span className="size-4 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" />
            Загружаем карту…
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-float">
            <p className="font-semibold">Не удалось загрузить подложку карты</p>
            <p className="mt-1 text-sm text-zinc-500">
              Проверьте подключение к интернету. Зоны и места доступны в списке.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
