// Игровые правила и рабочие допущения MVP в одном месте (допущение 10 ТЗ):
// пороги, очки, радиусы, ограничения геолокации, достижения.
// Значения можно менять здесь без правок UI и логики.

import type { PlaceCategory } from "@/generated/prisma/client";

/** Часовой пояс проекта для дневных/месячных границ. */
export const APP_TIMEZONE = "Europe/Minsk";
/** Смещение Minsk от UTC: фиксированные UTC+3 (без перевода часов) = 180 минут. */
export const APP_TZ_OFFSET_MINUTES = 3 * 60;

/** Очки XP (раздел 10 ТЗ). */
export const XP = {
  placeFirst: 10,
  zoneBronze: 20,
  zoneSilver: 40,
  zoneGold: 80,
  tripCompleted: 30,
} as const;

/** Уровень = floor(lifetimeXP / 100) + 1. */
export function levelForXp(lifetimeXp: number): number {
  return Math.floor(Math.max(0, lifetimeXp) / 100) + 1;
}

/** Рабочие радиусы подтверждения по категориям, метры (раздел 7 ТЗ). */
export const CATEGORY_RADIUS_M: Record<PlaceCategory, number> = {
  HISTORIC: 100,
  MUSEUM: 100,
  GASTRO: 100,
  CASTLE: 200,
  NATURE: 300,
  ECOTRAIL: 300,
  UNUSUAL: 150,
};

/** Радиус по умолчанию для категорий вне таблицы. */
export const DEFAULT_RADIUS_M = 150;

/** Ограничения геолокации (раздел 7 ТЗ). */
export const GEO_LIMITS = {
  /** Максимально допустимая точность, м. */
  maxAccuracyM: 100,
  /** Максимальный возраст позиции на момент проверки, сек. */
  maxPositionAgeSec: 60,
  /** Допуск «из будущего» для позиции, сек. */
  maxFutureSkewSec: 120,
  /** Тайм-аут получения позиции на клиенте, мс. */
  clientTimeoutMs: 15000,
} as const;

/** Правила кооператива (раздел 9 ТЗ). */
export const TRIP_RULES = {
  /** Минимум участников с подтверждением для совместной отметки. */
  jointConfirmationsRequired: 2,
  /** Максимальная разница подтверждений, мс (2 часа). */
  jointWindowMs: 2 * 60 * 60 * 1000,
  /** XP за завершение поездки выдаётся один раз на участника. */
} as const;

/** Правила отзывов до открытия зоны (допущение 6 ТЗ). */
export const REVIEW_RULES = {
  /** Сколько опубликованных отзывов видно до открытия зоны. */
  visibleBeforeUnlock: 3,
  minRating: 1,
  maxRating: 5,
} as const;

/** Ограничения фотоальбома (раздел 8 ТЗ). */
export const PHOTO_LIMITS = {
  maxPerEntry: 10,
  maxUploadBytes: 10 * 1024 * 1024,
  /** Полный размер длинной стороны, px. */
  maxEdgeFull: 1600,
  /** Превью длинной стороны, px. */
  maxEdgePreview: 400,
  webpQuality: 82,
} as const;

/** Дневной лимит повторных визитов: одно посещение места в календарный день Minsk. */
export const REVISIT_RULES = {
  /** Повторные визиты не увеличивают уникальные места и очки. */
  maxNormalVisitsPerDay: 1,
} as const;

/**
 * Определения достижений (раздел 10 ТЗ). condition.type:
 *  - unique_places: N уникальных мест
 *  - zones_unlocked: N открытых зон
 *  - gold_first: первое золото
 *  - category_places: N уникальных мест перечисленных категорий
 *  - first_joint_visit: первое совместное посещение
 *  - first_trip_completed: первая завершённая совместная поездка
 */
export type AchievementCondition =
  | { type: "unique_places"; count: number }
  | { type: "zones_unlocked"; count: number }
  | { type: "gold_first" }
  | { type: "category_places"; categories: PlaceCategory[]; count: number }
  | { type: "first_joint_visit" }
  | { type: "first_trip_completed" };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_step",
    name: "Первый шаг",
    description: "Подтвердите первое уникальное место",
    icon: "👣",
    condition: { type: "unique_places", count: 1 },
  },
  {
    id: "beyond_usual",
    name: "За пределами привычного",
    description: "Откройте 5 зон",
    icon: "🗺️",
    condition: { type: "zones_unlocked", count: 5 },
  },
  {
    id: "belarus_explorer",
    name: "Исследователь Беларуси",
    description: "Откройте 25 зон",
    icon: "🧭",
    condition: { type: "zones_unlocked", count: 25 },
  },
  {
    id: "territory_master",
    name: "Знаток территории",
    description: "Получите первое золото зоны",
    icon: "🥇",
    condition: { type: "gold_first" },
  },
  {
    id: "history_tracks",
    name: "По следам истории",
    description: "Посетите 5 исторических мест",
    icon: "🏛️",
    condition: { type: "category_places", categories: ["HISTORIC"], count: 5 },
  },
  {
    id: "castle_route",
    name: "Замковый маршрут",
    description: "Посетите 3 замка",
    icon: "🏰",
    condition: { type: "category_places", categories: ["CASTLE"], count: 3 },
  },
  {
    id: "closer_to_nature",
    name: "Ближе к природе",
    description: "Посетите 5 природных мест или экотроп",
    icon: "🌲",
    condition: { type: "category_places", categories: ["NATURE", "ECOTRAIL"], count: 5 },
  },
  {
    id: "taste_of_travel",
    name: "Вкус путешествия",
    description: "Посетите 3 гастрономические точки",
    icon: "🍽️",
    condition: { type: "category_places", categories: ["GASTRO"], count: 3 },
  },
  {
    id: "better_together",
    name: "Вместе интереснее",
    description: "Примите участие в первом совместном посещении",
    icon: "🤝",
    condition: { type: "first_joint_visit" },
  },
  {
    id: "team_adventure",
    name: "Командное приключение",
    description: "Завершите первую совместную поездку",
    icon: "🚩",
    condition: { type: "first_trip_completed" },
  },
];

/**
 * Сравнение друзей (раздел 9 ТЗ): без глобального рейтинга.
 * Tie-breaker при равных очках месяца: у кого раньше первое начисление XP
 * за месяц; при равенстве — по username.
 */
export const FRIEND_COMPARE_METRICS = [
  "zonesUnlocked",
  "uniquePlaces",
  "goldCount",
  "monthXp",
] as const;

/** Демонстрационные настройки карты по умолчанию. */
export const MAP_DEFAULTS = {
  center: [53.9, 27.9] as [number, number],
  fitBelarusZoom: 6,
  minZoom: 6,
  maxZoom: 17,
} as const;
