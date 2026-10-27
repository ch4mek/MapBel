import { describe, expect, it } from "vitest";
import {
  minskDayKey,
  minskMonthKey,
  minskMonthRange,
  toMinskWallClock,
} from "@/lib/dates";
import { levelForXp } from "@/config/game";

describe("границы Europe/Minsk (UTC+3)", () => {
  it("день меняется в 21:00 UTC", () => {
    // 2026-10-28T20:59Z → ещё 28 октября в Минске
    expect(minskDayKey(Date.UTC(2026, 9, 28, 20, 59))).toBe("2026-10-28");
    // 2026-10-28T21:00Z → уже 29 октября
    expect(minskDayKey(Date.UTC(2026, 9, 28, 21, 0))).toBe("2026-10-29");
  });

  it("месячный ключ считается по Минску", () => {
    // 2026-03-31T21:00Z = 1 апреля 00:00 по Минску
    expect(minskMonthKey(Date.UTC(2026, 2, 31, 21, 0))).toBe("2026-04");
    expect(minskMonthKey(Date.UTC(2026, 2, 31, 20, 59))).toBe("2026-03");
  });

  it("границы месяца — корректный полуинтервал UTC", () => {
    const { start, end } = minskMonthRange(Date.UTC(2026, 3, 15, 12, 0));
    expect(start.toISOString()).toBe("2026-03-31T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-30T21:00:00.000Z");
  });

  it("сдвиг стеночного времени +3 часа", () => {
    const wall = toMinskWallClock(Date.UTC(2026, 0, 1, 10, 0));
    expect(wall.toISOString()).toBe("2026-01-01T13:00:00.000Z");
  });
});

describe("уровни XP", () => {
  it("level = floor(lifetimeXP / 100) + 1", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(-5)).toBe(1);
  });
});
