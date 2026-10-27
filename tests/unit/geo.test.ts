import { describe, expect, it } from "vitest";
import {
  haversineDistanceM,
  isWithinRadius,
  validatePosition,
} from "@/lib/geo";

describe("haversineDistanceM", () => {
  it("нулевое расстояние для одинаковых точек", () => {
    const p = { lat: 53.9, lon: 27.56 };
    expect(haversineDistanceM(p, p)).toBeCloseTo(0, 6);
  });

  it("примерно 111 км на градус широты", () => {
    const d = haversineDistanceM({ lat: 53, lon: 27 }, { lat: 54, lon: 27 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("Минск — Мир примерно 90–100 км", () => {
    const d = haversineDistanceM(
      { lat: 53.9045, lon: 27.5615 },
      { lat: 53.4525, lon: 26.4725 },
    );
    expect(d).toBeGreaterThan(85_000);
    expect(d).toBeLessThan(105_000);
  });
});

describe("isWithinRadius", () => {
  const target = { lat: 53.4525, lon: 26.4725 }; // Мирский замок

  it("позиция в радиусе засчитывается", () => {
    // ~30 м к северу
    const pos = { lat: 53.45277, lon: 26.4725 };
    expect(isWithinRadius(pos, target, 200, 10)).toBe(true);
  });

  it("позиция далеко (испорченные координаты из ТЗ, AC03) не засчитывается", () => {
    const pos = { lat: 53.9, lon: 27.56 }; // Минск, ~95 км
    expect(isWithinRadius(pos, target, 200, 50)).toBe(false);
  });

  it("точность вычитается из запаса: на грани радиуса", () => {
    // ~250 м к востоку при радиусе 200: без точности далеко,
    // с accuracy 100 всё ещё дальше (250-100=150 <= 200 → true)
    const pos = { lat: 53.4525, lon: 26.47575 };
    expect(isWithinRadius(pos, target, 200, 0)).toBe(false);
    expect(isWithinRadius(pos, target, 200, 100)).toBe(true);
  });
});

describe("validatePosition (раздел 7 ТЗ)", () => {
  const now = 1_800_000_000_000;
  const ok = {
    latitude: 53.4525,
    longitude: 26.4725,
    accuracy: 15,
    positionTimestamp: now - 5_000,
  };

  it("корректная свежая позиция проходит", () => {
    expect(validatePosition(ok, { now })).toBeNull();
  });

  it("нечисловые координаты отклоняются", () => {
    expect(
      validatePosition({ ...ok, latitude: Number.NaN }, { now }),
    ).toBe("NOT_A_NUMBER");
  });

  it("невозможные координаты отклоняются", () => {
    expect(validatePosition({ ...ok, latitude: 91 }, { now })).toBe("OUT_OF_RANGE");
    expect(validatePosition({ ...ok, longitude: -181 }, { now })).toBe("OUT_OF_RANGE");
  });

  it("отрицательная точность отклоняется", () => {
    expect(validatePosition({ ...ok, accuracy: -1 }, { now })).toBe(
      "NEGATIVE_ACCURACY",
    );
  });

  it("точность хуже 100 м отклоняется", () => {
    expect(validatePosition({ ...ok, accuracy: 101 }, { now })).toBe(
      "ACCURACY_TOO_LOW",
    );
    expect(validatePosition({ ...ok, accuracy: 100 }, { now })).toBeNull();
  });

  it("заметно будущий timestamp отклоняется", () => {
    expect(
      validatePosition({ ...ok, positionTimestamp: now + 121_000 }, { now }),
    ).toBe("POSITION_IN_FUTURE");
  });

  it("устаревшая позиция (>60 сек) отклоняется", () => {
    expect(
      validatePosition({ ...ok, positionTimestamp: now - 61_000 }, { now }),
    ).toBe("POSITION_TOO_OLD");
    expect(
      validatePosition({ ...ok, positionTimestamp: now - 59_000 }, { now }),
    ).toBeNull();
  });
});
