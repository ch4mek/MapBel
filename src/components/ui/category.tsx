import {
  Castle,
  Footprints,
  Landmark,
  ScrollText,
  Sparkles,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PlaceCategoryKey } from "@/lib/place-meta";
import { PLACE_CATEGORY_LABELS } from "@/lib/place-meta";
import { cn } from "@/lib/cn";

export const CATEGORY_ICON: Record<PlaceCategoryKey, LucideIcon> = {
  HISTORIC: ScrollText,
  MUSEUM: Landmark,
  CASTLE: Castle,
  NATURE: Trees,
  ECOTRAIL: Footprints,
  GASTRO: UtensilsCrossed,
  UNUSUAL: Sparkles,
};

/** Акцентные цвета категорий: фон плашки, текст, hex для маркеров карты. */
export const CATEGORY_STYLE: Record<
  PlaceCategoryKey,
  { soft: string; text: string; hex: string; gradient: string }
> = {
  HISTORIC: { soft: "bg-amber-50", text: "text-amber-700", hex: "#b45309", gradient: "from-amber-500 to-orange-700" },
  MUSEUM: { soft: "bg-violet-50", text: "text-violet-700", hex: "#6d28d9", gradient: "from-violet-500 to-indigo-700" },
  CASTLE: { soft: "bg-rose-50", text: "text-rose-700", hex: "#be123c", gradient: "from-rose-500 to-red-800" },
  NATURE: { soft: "bg-emerald-50", text: "text-emerald-700", hex: "#047857", gradient: "from-emerald-500 to-green-800" },
  ECOTRAIL: { soft: "bg-lime-50", text: "text-lime-700", hex: "#4d7c0f", gradient: "from-lime-500 to-emerald-700" },
  GASTRO: { soft: "bg-orange-50", text: "text-orange-700", hex: "#c2410c", gradient: "from-orange-400 to-rose-600" },
  UNUSUAL: { soft: "bg-sky-50", text: "text-sky-700", hex: "#0369a1", gradient: "from-sky-500 to-blue-700" },
};

export function CategoryIcon({
  category,
  className,
}: {
  category: PlaceCategoryKey;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  return <Icon className={className} aria-hidden />;
}

export function CategoryBadge({
  category,
  size = "md",
}: {
  category: PlaceCategoryKey;
  size?: "sm" | "md";
}) {
  const s = CATEGORY_STYLE[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        s.soft,
        s.text,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <CategoryIcon category={category} className={size === "sm" ? "size-3" : "size-3.5"} />
      {PLACE_CATEGORY_LABELS[category]}
    </span>
  );
}

/** Квадратная иконка категории в цветной плашке. */
export function CategoryTile({
  category,
  className,
}: {
  category: PlaceCategoryKey;
  className?: string;
}) {
  const s = CATEGORY_STYLE[category];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        s.soft,
        s.text,
        className ?? "size-10",
      )}
    >
      <CategoryIcon category={category} className="size-[45%]" />
    </span>
  );
}
