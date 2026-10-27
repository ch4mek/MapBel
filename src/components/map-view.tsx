"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { MapMouseEvent, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPlaceDTO, MapZoneDTO } from "@/lib/catalog";
import { PLACE_CATEGORY_ICONS } from "@/lib/place-meta";
import { MAP_DEFAULTS } from "@/config/game";

const BELARUS_BOUNDS: [[number, number], [number, number]] = [
  [23.1, 51.2],
  [32.8, 56.8],
];

const STATUS_FILL: Record<string, string> = {
  NONE: "#9aa5ae",
  BRONZE: "#c98a3d",
  SILVER: "#8fa1b3",
  GOLD: "#d8b013",
};

export interface MapViewProps {
  zones: MapZoneDTO[];
  places: MapPlaceDTO[];
  styleUrl: string;
  selectedZoneId: string | null;
  focusPlace: MapPlaceDTO | null;
  onZoneClick: (zoneId: string) => void;
  onPlaceClick: (place: MapPlaceDTO) => void;
  userLocation: { lat: number; lon: number } | null;
}

export default function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Инициализация карты (один раз)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: props.styleUrl,
      center: MAP_DEFAULTS.center.slice().reverse() as [number, number],
      zoom: MAP_DEFAULTS.fitBelarusZoom,
      minZoom: MAP_DEFAULTS.minZoom,
      maxZoom: MAP_DEFAULTS.maxZoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "zone-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "GOLD", STATUS_FILL.GOLD,
            "SILVER", STATUS_FILL.SILVER,
            "BRONZE", STATUS_FILL.BRONZE,
            STATUS_FILL.NONE,
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.42,
            0.18,
          ],
        },
      });
      map.addLayer({
        id: "zone-outline",
        type: "line",
        source: "zones",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "GOLD", "#a9820a",
            "SILVER", "#64748b",
            "BRONZE", "#92610f",
            "#6b7784",
          ],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3.5, 1.6],
        },
      });
      map.fitBounds(BELARUS_BOUNDS, { padding: 24, duration: 0 });
      setReady(true);
    });
    map.on("click", "zone-fill", (e: MapMouseEvent & { features?: unknown }) => {
      const f = (e as { features?: { properties?: Record<string, unknown> }[] }).features?.[0];
      const zoneId = f?.properties?.["zoneId"];
      if (typeof zoneId === "string") props.onZoneClick(zoneId);
    });
    map.on("mouseenter", "zone-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "zone-fill", () => {
      map.getCanvas().style.cursor = "";
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Данные зон: границы не меняются при изменении масштаба (раздел 6 ТЗ)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("zones") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: props.zones.map((z) => ({
        type: "Feature" as const,
        id: z.id,
        geometry: z.geometry as GeoJSON.Polygon,
        properties: {
          zoneId: z.id,
          name: z.name,
          status: z.status,
        },
      })),
    });
  }, [props.zones, ready]);

  // Метки мест
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = props.places.map((p) => {
      const el = document.createElement("div");
      el.className = "map-pin" + (p.visited ? " visited" : "");
      el.title = p.name;
      el.innerHTML = `<span>${PLACE_CATEGORY_ICONS[p.category] ?? "📍"}</span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        props.onPlaceClick(p);
      });
      return new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .addTo(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.places, ready]);

  // Выделение зоны → приблизить
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!props.selectedZoneId) return;
    const zone = props.zones.find((z) => z.id === props.selectedZoneId);
    if (!zone) return;
    const geom = zone.geometry as GeoJSON.Polygon;
    const lons: number[] = [];
    const lats: number[] = [];
    for (const ring of geom.coordinates) {
      for (const [lon, lat] of ring) {
        lons.push(lon);
        lats.push(lat);
      }
    }
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 12, duration: 600 },
    );
  }, [props.selectedZoneId, props.zones, ready]);

  // Фокус на место
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.focusPlace) return;
    map.flyTo({
      center: [props.focusPlace.lon, props.focusPlace.lat],
      zoom: 14,
      duration: 600,
    });
  }, [props.focusPlace, ready]);

  // Позиция пользователя
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (props.userLocation) {
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:16px;height:16px;border-radius:50%;background:#1d7fd6;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.4)";
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([props.userLocation.lon, props.userLocation.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([props.userLocation.lon, props.userLocation.lat]);
      }
    }
  }, [props.userLocation, ready]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[320px] w-full rounded-xl border bg-[#dfe7ec]"
      role="application"
      aria-label="Карта Беларуси с зонами и местами"
    />
  );
}
