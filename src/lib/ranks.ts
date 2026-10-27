// Переходы рангов зоны (раздел 6 ТЗ). Чистые функции — покрыты unit-тестами.

export type Rank = "NONE" | "BRONZE" | "SILVER" | "GOLD";

export const RANK_ORDER: Record<Rank, number> = {
  NONE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
};

export interface RankInputs {
  /** Количество уникальных подтверждённых мест зоны у пользователя. */
  uniquePlaces: number;
  /** Порог серебра (индивидуальный для зоны). */
  silverThreshold: number;
  /** Минимальное количество уникальных мест для золота. */
  goldMinCount: number;
  /** Все ли места из набора gold_required_places посещены. */
  goldRequiredAllVisited: boolean;
  /** В зоне вообще есть опубликованные места. */
  hasPublishedPlaces: boolean;
}

/**
 * Вычисляет достижимый ранг по текущему состоянию.
 * Бронза — первое уникальное место; серебро — порог unique_places;
 * золото — весь набор gold_required + gold_min_count.
 * При равных порогах присваивается высший доступный статус.
 */
export function computeRank(inputs: RankInputs): Rank {
  const {
    uniquePlaces,
    silverThreshold,
    goldMinCount,
    goldRequiredAllVisited,
    hasPublishedPlaces,
  } = inputs;
  if (!hasPublishedPlaces || uniquePlaces < 1) return "NONE";
  let rank: Rank = "BRONZE";
  if (silverThreshold > 0 && uniquePlaces >= silverThreshold) rank = "SILVER";
  if (goldMinCount > 0 && uniquePlaces >= goldMinCount && goldRequiredAllVisited) {
    rank = "GOLD";
  }
  return rank;
}

/**
 * Монотонное применение нового ранга: статус никогда не понижается.
 * Возвращает итоговый ранг и список впервые достигнутых ступеней
 * (для разового начисления XP за каждую ранее невыданную, раздел 10 ТЗ).
 */
export function applyRankMonotonic(current: Rank, computed: Rank): {
  next: Rank;
  newlyReached: Rank[];
} {
  if (RANK_ORDER[computed] <= RANK_ORDER[current]) {
    return { next: current, newlyReached: [] };
  }
  const newlyReached: Rank[] = [];
  if (RANK_ORDER[current] < RANK_ORDER.BRONZE && RANK_ORDER[computed] >= RANK_ORDER.BRONZE) {
    newlyReached.push("BRONZE");
  }
  if (RANK_ORDER[current] < RANK_ORDER.SILVER && RANK_ORDER[computed] >= RANK_ORDER.SILVER) {
    newlyReached.push("SILVER");
  }
  if (RANK_ORDER[current] < RANK_ORDER.GOLD && RANK_ORDER[computed] >= RANK_ORDER.GOLD) {
    newlyReached.push("GOLD");
  }
  return { next: computed, newlyReached };
}

export const RANK_LABELS: Record<Rank, string> = {
  NONE: "Не открыто",
  BRONZE: "Бронза",
  SILVER: "Серебро",
  GOLD: "Золото",
};

/** Иконка ранга — смысл кодируется не только цветом (раздел 6 ТЗ). */
export const RANK_ICONS: Record<Rank, string> = {
  NONE: "🔒",
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
};
