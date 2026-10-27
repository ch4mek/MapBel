// Клиентобезопасные константы категорий (без серверных зависимостей).

export type PlaceCategoryKey =
  | "HISTORIC"
  | "MUSEUM"
  | "CASTLE"
  | "NATURE"
  | "ECOTRAIL"
  | "GASTRO"
  | "UNUSUAL";

export const PLACE_CATEGORY_LABELS: Record<PlaceCategoryKey, string> = {
  HISTORIC: "Историческое место",
  MUSEUM: "Музей",
  CASTLE: "Замок / усадьба",
  NATURE: "Природа",
  ECOTRAIL: "Экотропа",
  GASTRO: "Гастрономия",
  UNUSUAL: "Необычное место",
};

export const PLACE_CATEGORY_ICONS: Record<PlaceCategoryKey, string> = {
  HISTORIC: "🏛️",
  MUSEUM: "🖼️",
  CASTLE: "🏰",
  NATURE: "🌲",
  ECOTRAIL: "🥾",
  GASTRO: "🍽️",
  UNUSUAL: "✨",
};
