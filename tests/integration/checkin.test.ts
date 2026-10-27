// Интеграционные тесты чек-ина (AC03–AC06). Требуют локальную MySQL
// из .env и применённый seed (npm run db:seed): используется место
// «Мирский замок» из демо-зоны «Мир».

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { performCheckin, type CheckinInput } from "@/lib/checkin";
import { ApiError } from "@/lib/api-errors";

const PLACE_SLUG = "mir-castle";
const CENTER = { lat: 53.4525, lon: 26.4725 };

function nearInput(placeId: string, key: string): CheckinInput {
  return {
    placeId,
    latitude: CENTER.lat + 0.0002, // ~22 м к северу
    longitude: CENTER.lon,
    accuracy: 12,
    positionTimestamp: Date.now() - 3_000,
    idempotencyKey: key,
  };
}

let userId: string;
let placeId: string;
let zoneSilverThreshold: number;

async function totalXp(uid: string): Promise<number> {
  const agg = await prisma.rewardEvent.aggregate({
    where: { userId: uid },
    _sum: { xp: true },
  });
  return agg._sum.xp ?? 0;
}

beforeAll(async () => {
  const place = await prisma.place.findUniqueOrThrow({
    where: { slug: PLACE_SLUG },
    include: { zone: true },
  });
  placeId = place.id;
  zoneSilverThreshold = place.zone.silverThreshold;

  const suffix = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `it-checkin-${suffix}@test.local`,
      username: `it_ck_${suffix}`,
      displayName: "Интеграционный тест",
      passwordHash: await bcrypt.hash("test-password", 4),
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("подтверждение посещения (серверная проверка)", () => {
  it("AC03: координаты далеко от места не создают визит и не дают XP", async () => {
    const before = await totalXp(userId);
    await expect(
      performCheckin(userId, {
        placeId,
        latitude: 53.9, // Минск — далеко
        longitude: 27.56,
        accuracy: 10,
        positionTimestamp: Date.now() - 3_000,
        idempotencyKey: `far-${Date.now()}`,
      }),
    ).rejects.toMatchObject({ code: "FAR_FROM_PLACE" });

    const visits = await prisma.visit.count({ where: { userId, placeId } });
    expect(visits).toBe(0);
    expect(await totalXp(userId)).toBe(before);
  });

  it("AC07: низкая точность и устаревшая позиция отклоняются без визита", async () => {
    await expect(
      performCheckin(userId, {
        ...nearInput(placeId, `acc-${Date.now()}`),
        accuracy: 150,
      }),
    ).rejects.toMatchObject({ code: "GEO_ACCURACY_TOO_LOW" });

    await expect(
      performCheckin(userId, {
        ...nearInput(placeId, `old-${Date.now()}`),
        positionTimestamp: Date.now() - 120_000,
      }),
    ).rejects.toMatchObject({ code: "GEO_POSITION_TOO_OLD" });

    expect(await prisma.visit.count({ where: { userId, placeId } })).toBe(0);
  });

  it("AC04: свежая допустимая позиция создаёт визит, бронзу и награды", async () => {
    const res = await performCheckin(userId, nearInput(placeId, "key-first"));
    expect(res.repeatVisit).toBe(false);
    expect(res.newlyReachedRanks).toContain("BRONZE");
    expect(res.xpGained).toBe(10 + 20); // место + бронза
    expect(res.achievementsAwarded).toContain("first_step");

    const visit = await prisma.visit.findUniqueOrThrow({ where: { id: res.visitId } });
    expect(visit.isUniqueForUser).toBe(true);
    expect(visit.userId).toBe(userId);

    const progress = await prisma.userZoneProgress.findUniqueOrThrow({
      where: { userId_zoneId: { userId, zoneId: (await placeZoneId()) } },
    });
    expect(progress.status).toBe("BRONZE");
    expect(progress.uniquePlaces).toBe(1);
    expect(progress.bronzeAt).not.toBeNull();

    // Ledger: уникальные ключи событий
    const keys = await prisma.rewardEvent.findMany({
      where: { userId },
      select: { eventKey: true, xp: true },
    });
    expect(keys.map((k) => k.eventKey).sort()).toEqual([
      `place_first:${userId}:${placeId}`,
      `zone_bronze:${userId}:${(await placeZoneId())}`,
    ]);
  });

  it("AC05: повтор того же запроса (тот же idempotencyKey) не дублирует ничего", async () => {
    const before = await totalXp(userId);
    const visitsBefore = await prisma.visit.count({ where: { userId, placeId } });

    const res = await performCheckin(userId, nearInput(placeId, "key-first"));
    expect(res.repeatVisit).toBe(true);
    expect(res.xpGained).toBe(0);

    expect(await prisma.visit.count({ where: { userId, placeId } })).toBe(visitsBefore);
    expect(await totalXp(userId)).toBe(before);
  });

  it("AC05: повторный визит того же места в тот же день не даёт XP", async () => {
    const before = await totalXp(userId);
    // другой ключ идемпотентности, но то же место и тот же день Minsk
    await expect(
      performCheckin(userId, nearInput(placeId, "key-second-same-day")),
    ).rejects.toMatchObject({ code: "ALREADY_VISITED_TODAY" });
    expect(await totalXp(userId)).toBe(before);
  });

  it("AC05: конкурентные запросы создают один визит и не удваивают XP", async () => {
    // Второе место зоны для чистоты сценария
    const place2 = await prisma.place.findUniqueOrThrow({
      where: { slug: "mir-nikolskaya-cerkov" },
    });
    const p2lat = place2.lat.toNumber();
    const p2lon = place2.lon.toNumber();

    const attempts = [
      {
        placeId: place2.id,
        latitude: p2lat + 0.0002,
        longitude: p2lon,
        accuracy: 12,
        positionTimestamp: Date.now() - 3_000,
        idempotencyKey: `race-a-${Date.now()}`,
      },
      {
        placeId: place2.id,
        latitude: p2lat - 0.0002,
        longitude: p2lon,
        accuracy: 12,
        positionTimestamp: Date.now() - 3_000,
        idempotencyKey: `race-b-${Date.now()}`,
      },
    ];
    const results = await Promise.allSettled(
      attempts.map((a) => performCheckin(userId, a)),
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect((reason as ApiError).code).toBe("ALREADY_VISITED_TODAY");

    expect(await prisma.visit.count({ where: { userId, placeId: place2.id } })).toBe(1);
    // place_first за это место ровно один раз
    const firstKeys = await prisma.rewardEvent.count({
      where: { userId, eventKey: `place_first:${userId}:${place2.id}` },
    });
    expect(firstKeys).toBe(1);
  });

  it("AC06: достижение порога выдаёт серебро; статус монотонный", async () => {
    const zoneId = await placeZoneId();
    // После двух уникальных мест зоны «Мир» (silverThreshold = 2)
    // серебро достигнуто автоматически.
    expect(zoneSilverThreshold).toBe(2);
    const progress = await prisma.userZoneProgress.findUniqueOrThrow({
      where: { userId_zoneId: { userId, zoneId } },
    });
    expect(progress.uniquePlaces).toBe(2);
    expect(progress.status).toBe("SILVER");
    expect(progress.bronzeAt).not.toBeNull();
    expect(progress.silverAt).not.toBeNull();

    const silverReward = await prisma.rewardEvent.findUnique({
      where: { eventKey: `zone_silver:${userId}:${zoneId}` },
    });
    expect(silverReward).not.toBeNull();
    expect(silverReward!.xp).toBe(40);

    // Монотонность: пересчёт с нулём не понижает статус (проверка чистой функции
    // уже покрыта unit-тестами; здесь — целостность данных: награда одна).
    const silverCount = await prisma.rewardEvent.count({
      where: { userId, eventKey: `zone_silver:${userId}:${zoneId}` },
    });
    expect(silverCount).toBe(1);
  });
});

async function placeZoneId(): Promise<string> {
  const place = await prisma.place.findUniqueOrThrow({
    where: { slug: PLACE_SLUG },
    select: { zoneId: true },
  });
  return place.zoneId;
}
