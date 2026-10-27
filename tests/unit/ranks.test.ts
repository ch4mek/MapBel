import { describe, expect, it } from "vitest";
import { applyRankMonotonic, computeRank } from "@/lib/ranks";
import { ACHIEVEMENTS, TRIP_RULES, REVIEW_RULES } from "@/config/game";

describe("computeRank (раздел 6 ТЗ)", () => {
  const base = {
    uniquePlaces: 0,
    silverThreshold: 3,
    goldMinCount: 5,
    goldRequiredAllVisited: false,
    hasPublishedPlaces: true,
  };

  it("нет мест — NONE", () => {
    expect(computeRank(base)).toBe("NONE");
  });

  it("пустая зона — NONE («задания готовятся»)", () => {
    expect(computeRank({ ...base, uniquePlaces: 3, hasPublishedPlaces: false })).toBe("NONE");
  });

  it("первое место — бронза", () => {
    expect(computeRank({ ...base, uniquePlaces: 1 })).toBe("BRONZE");
  });

  it("порог silverThreshold — серебро", () => {
    expect(computeRank({ ...base, uniquePlaces: 2 })).toBe("BRONZE");
    expect(computeRank({ ...base, uniquePlaces: 3 })).toBe("SILVER");
  });

  it("золото: gold_min_count + весь набор gold_required", () => {
    expect(
      computeRank({ ...base, uniquePlaces: 5, goldRequiredAllVisited: true }),
    ).toBe("GOLD");
    expect(
      computeRank({ ...base, uniquePlaces: 5, goldRequiredAllVisited: false }),
    ).toBe("SILVER");
    expect(
      computeRank({ ...base, uniquePlaces: 3, goldRequiredAllVisited: true }),
    ).toBe("SILVER");
  });

  it("gold_min_count = 0 — золото недостижимо", () => {
    expect(
      computeRank({
        ...base,
        uniquePlaces: 10,
        goldMinCount: 0,
        goldRequiredAllVisited: true,
      }),
    ).toBe("SILVER");
  });

  it("равные пороги — присваивается высший статус", () => {
    expect(
      computeRank({
        ...base,
        uniquePlaces: 3,
        silverThreshold: 3,
        goldMinCount: 3,
        goldRequiredAllVisited: true,
      }),
    ).toBe("GOLD");
  });
});

describe("applyRankMonotonic (статус не понижается)", () => {
  it("переход NONE → GOLD выдаёт все три награды однократно", () => {
    const { next, newlyReached } = applyRankMonotonic("NONE", "GOLD");
    expect(next).toBe("GOLD");
    expect(newlyReached).toEqual(["BRONZE", "SILVER", "GOLD"]);
  });

  it("понижающий пересчёт игнорируется", () => {
    const { next, newlyReached } = applyRankMonotonic("GOLD", "SILVER");
    expect(next).toBe("GOLD");
    expect(newlyReached).toEqual([]);
  });

  it("без изменений — пустой список наград", () => {
    const { newlyReached } = applyRankMonotonic("SILVER", "SILVER");
    expect(newlyReached).toEqual([]);
  });

  it("серебро → золото выдаёт только золото", () => {
    const { next, newlyReached } = applyRankMonotonic("SILVER", "GOLD");
    expect(next).toBe("GOLD");
    expect(newlyReached).toEqual(["GOLD"]);
  });
});

describe("конфиг игры", () => {
  it("10 достижений из ТЗ", () => {
    expect(ACHIEVEMENTS.length).toBe(10);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(10);
  });

  it("правила кооператива: минимум 2 участника, окно 2 часа", () => {
    expect(TRIP_RULES.jointConfirmationsRequired).toBe(2);
    expect(TRIP_RULES.jointWindowMs).toBe(2 * 60 * 60 * 1000);
  });

  it("до открытия зоны видны 3 отзыва", () => {
    expect(REVIEW_RULES.visibleBeforeUnlock).toBe(3);
  });
});
