import { Lock, Medal, Trophy } from "lucide-react";
import type { Rank } from "@/lib/ranks";
import { RANK_LABELS } from "@/lib/ranks";
import { cn } from "@/lib/cn";

export const RANK_STYLE: Record<
  Rank,
  { soft: string; text: string; ring: string; gradient: string; hex: string }
> = {
  NONE: {
    soft: "bg-zinc-100",
    text: "text-zinc-600",
    ring: "ring-zinc-200",
    gradient: "from-zinc-300 to-zinc-500",
    hex: "#9ca3af",
  },
  BRONZE: {
    soft: "bg-bronze-50",
    text: "text-bronze-700",
    ring: "ring-bronze-100",
    gradient: "from-[#d08a52] to-[#8f5323]",
    hex: "#b06b34",
  },
  SILVER: {
    soft: "bg-silver-50",
    text: "text-silver-700",
    ring: "ring-silver-100",
    gradient: "from-[#a9b6c6] to-[#66778c]",
    hex: "#7b8ca1",
  },
  GOLD: {
    soft: "bg-gold-50",
    text: "text-gold-700",
    ring: "ring-gold-100",
    gradient: "from-[#f2c13c] to-[#b98505]",
    hex: "#d49b0b",
  },
};

/** Значок ранга: иконка + текст, смысл не кодируется только цветом. */
export function RankBadge({ rank, size = "md" }: { rank: Rank; size?: "sm" | "md" }) {
  const s = RANK_STYLE[rank];
  const Icon = rank === "NONE" ? Lock : rank === "GOLD" ? Trophy : Medal;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1",
        s.soft,
        s.text,
        s.ring,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {RANK_LABELS[rank]}
    </span>
  );
}

/** Круглая медаль с градиентом. */
export function RankMedal({ rank, className }: { rank: Rank; className?: string }) {
  const s = RANK_STYLE[rank];
  const Icon = rank === "NONE" ? Lock : rank === "GOLD" ? Trophy : Medal;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm",
        s.gradient,
        className ?? "size-10",
      )}
      aria-label={RANK_LABELS[rank]}
      role="img"
    >
      <Icon className="size-[48%]" aria-hidden />
    </span>
  );
}

/**
 * Лесенка рангов зоны: бронза → серебро → золото с отметкой текущего.
 */
export function RankLadder({
  rank,
  uniquePlaces,
  silverThreshold,
  goldMinCount,
  goldAvailable,
}: {
  rank: Rank;
  uniquePlaces: number;
  silverThreshold: number;
  goldMinCount: number;
  goldAvailable: boolean;
}) {
  const steps: { key: Rank; label: string; need: string }[] = [
    { key: "BRONZE", label: "Бронза", need: "1 место" },
    { key: "SILVER", label: "Серебро", need: `${silverThreshold} мест` },
    {
      key: "GOLD",
      label: "Золото",
      need: goldAvailable ? `${goldMinCount} мест + подборка` : "готовится",
    },
  ];
  const order: Record<Rank, number> = { NONE: 0, BRONZE: 1, SILVER: 2, GOLD: 3 };
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s) => {
        const reached = order[rank] >= order[s.key];
        const st = RANK_STYLE[s.key];
        return (
          <li
            key={s.key}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center",
              reached ? cn(st.soft, "border-transparent") : "border-zinc-200 bg-white",
            )}
          >
            <RankMedal rank={reached ? s.key : "NONE"} className="size-8" />
            <span className={cn("text-xs font-bold", reached ? st.text : "text-zinc-700")}>
              {s.label}
            </span>
            <span className="text-[11px] leading-tight text-zinc-500">{s.need}</span>
          </li>
        );
      })}
      <li className="sr-only">Открыто уникальных мест: {uniquePlaces}</li>
    </ol>
  );
}
