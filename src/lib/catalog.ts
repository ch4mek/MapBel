// Каталог зон и мест: выдача данных карты, карточек, гейтинг отзывов
// до открытия зоны (допущение 6 ТЗ). Скрытые данные клиенту не уходят.

import type { PlaceCategory } from "@/generated/prisma/client";
import { REVIEW_RULES } from "@/config/game";
import { prisma } from "@/lib/prisma";
import { CATEGORY_RADIUS_M, DEFAULT_RADIUS_M } from "@/config/game";
import type { Rank } from "@/lib/ranks";

export interface MapZoneDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  geometry: unknown; // GeoJSON Polygon/MultiPolygon
  centerLat: number;
  centerLon: number;
  isDemo: boolean;
  silverThreshold: number;
  goldMinCount: number;
  goldRequiredCount: number;
  publishedPlaces: number;
  status: Rank;
  uniquePlaces: number;
}

export interface MapPlaceDTO {
  id: string;
  slug: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  zoneId: string;
  visited: boolean;
  shortDescription: string;
}

function shorten(text: string, max = 140): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:—-]+$/, "") + "…";
}

/** Все зоны для карты + персональный прогресс (если вошёл). */
export async function getMapZones(userId: string | null): Promise<MapZoneDTO[]> {
  const zones = await prisma.zone.findMany({
    include: {
      _count: { select: { places: { where: { publicationStatus: "PUBLISHED" } } } },
      goldRequired: { select: { placeId: true } },
    },
    orderBy: { name: "asc" },
  });

  const progresses = userId
    ? await prisma.userZoneProgress.findMany({ where: { userId } })
    : [];
  const progressByZone = new Map(progresses.map((p) => [p.zoneId, p]));

  return zones.map((z) => {
    const progress = progressByZone.get(z.id);
    return {
      id: z.id,
      slug: z.slug,
      name: z.name,
      description: z.description,
      geometry: z.geometry,
      centerLat: z.centerLat.toNumber(),
      centerLon: z.centerLon.toNumber(),
      isDemo: z.isDemo,
      silverThreshold: z.silverThreshold,
      goldMinCount: z.goldMinCount,
      goldRequiredCount: z.goldRequired.length,
      publishedPlaces: z._count.places,
      status: (progress?.status ?? "NONE") as Rank,
      uniquePlaces: progress?.uniquePlaces ?? 0,
    };
  });
}

/** Опубликованные места для карты + флаг «посещено мной». */
export async function getMapPlaces(userId: string | null): Promise<MapPlaceDTO[]> {
  const places = await prisma.place.findMany({
    where: { publicationStatus: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      lat: true,
      lon: true,
      zoneId: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });
  const visited = userId
    ? await prisma.visit.findMany({
        where: { userId, isUniqueForUser: true },
        select: { placeId: true },
        distinct: ["placeId"],
      })
    : [];
  const visitedSet = new Set(visited.map((v) => v.placeId));
  return places.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    lat: p.lat.toNumber(),
    lon: p.lon.toNumber(),
    zoneId: p.zoneId,
    visited: visitedSet.has(p.id),
    shortDescription: shorten(p.description),
  }));
}

export interface PlaceCardDTO {
  id: string;
  slug: string;
  name: string;
  category: PlaceCategory;
  description: string;
  lat: number;
  lon: number;
  radiusM: number;
  address: string | null;
  openingHours: string | null;
  priceInfo: string | null;
  contacts: string | null;
  officialUrl: string | null;
  accessibility: string | null;
  arrivalTips: string | null;
  sourceUrl: string | null;
  license: string | null;
  verifiedAt: string | null;
  isDemo: boolean;
  zone: { id: string; slug: string; name: string; status: Rank; silverThreshold: number; goldMinCount: number; uniquePlaces: number };
  media: { storageKey: string; caption: string | null; isCover: boolean }[];
  visited: boolean;
  visitCount: number;
  reviewsTotal: number;
  reviewsVisible: number;
  ratingAvg: number | null;
  reviews: {
    id: string;
    rating: number;
    text: string | null;
    tips: string | null;
    createdAt: string;
    hasConfirmedVisit: boolean;
    author: { displayName: string; username: string };
    truncated: boolean;
  }[];
}

/**
 * Карточка места. До открытия зоны — только REVIEW_RULES.visibleBeforeUnlock
 * последних отзывов (и клиент не получает скрытые, чтобы не «утекали» через API).
 * Общая оценка, предупреждения (tips) и логистика доступны всегда.
 */
export async function getPlaceCard(
  slug: string,
  userId: string | null,
): Promise<PlaceCardDTO | null> {
  const place = await prisma.place.findUnique({
    where: { slug },
    include: {
      zone: {
        include: {
          goldRequired: { select: { placeId: true } },
        },
      },
      media: { orderBy: [{ isCover: "desc" }, { sort: "asc" }] },
    },
  });
  if (!place || place.publicationStatus !== "PUBLISHED") return null;

  const progress = userId
    ? await prisma.userZoneProgress.findUnique({
        where: { userId_zoneId: { userId, zoneId: place.zoneId } },
      })
    : null;
  const zoneStatus = (progress?.status ?? "NONE") as Rank;
  const uniquePlaces = progress?.uniquePlaces ?? 0;

  const reviewsTotal = await prisma.review.count({
    where: { placeId: place.id, moderationStatus: "ACTIVE" },
  });
  const agg = await prisma.review.aggregate({
    where: { placeId: place.id, moderationStatus: "ACTIVE" },
    _avg: { rating: true },
  });

  const limit =
    zoneStatus === "NONE"
      ? REVIEW_RULES.visibleBeforeUnlock
      : undefined; // после открытия — все

  const reviews = await prisma.review.findMany({
    where: { placeId: place.id, moderationStatus: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { displayName: true, username: true, visits: { where: { placeId: place.id }, select: { id: true }, take: 1 } },
      },
    },
  });

  const visitCount = userId
    ? await prisma.visit.count({ where: { userId, placeId: place.id } })
    : 0;

  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    category: place.category,
    description: place.description,
    lat: place.lat.toNumber(),
    lon: place.lon.toNumber(),
    radiusM: place.radiusM ?? CATEGORY_RADIUS_M[place.category] ?? DEFAULT_RADIUS_M,
    address: place.address,
    openingHours: place.openingHours,
    priceInfo: place.priceInfo,
    contacts: place.contacts,
    officialUrl: place.officialUrl,
    accessibility: place.accessibility,
    arrivalTips: place.arrivalTips,
    sourceUrl: place.sourceUrl,
    license: place.license,
    verifiedAt: place.verifiedAt?.toISOString() ?? null,
    isDemo: place.isDemo,
    zone: {
      id: place.zone.id,
      slug: place.zone.slug,
      name: place.zone.name,
      status: zoneStatus,
      silverThreshold: place.zone.silverThreshold,
      goldMinCount: place.zone.goldMinCount,
      uniquePlaces,
    },
    media: place.media.map((m) => ({
      storageKey: m.storageKey,
      caption: m.caption,
      isCover: m.isCover,
    })),
    visited: visitCount > 0,
    visitCount,
    reviewsTotal,
    reviewsVisible: reviews.length,
    ratingAvg: agg._avg.rating ?? null,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      tips: r.tips,
      createdAt: r.createdAt.toISOString(),
      hasConfirmedVisit: r.user.visits.length > 0,
      author: { displayName: r.user.displayName, username: r.user.username },
      truncated: zoneStatus === "NONE",
    })),
  };
}

export { PLACE_CATEGORY_LABELS, PLACE_CATEGORY_ICONS } from "@/lib/place-meta";
