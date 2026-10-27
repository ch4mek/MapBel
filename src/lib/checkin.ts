import type { PlaceCategory, Prisma } from "@/generated/prisma/client";
import {
  CATEGORY_RADIUS_M,
  DEFAULT_RADIUS_M,
  TRIP_RULES,
  XP,
} from "@/config/game";
import { prisma } from "@/lib/prisma";
import { ApiError, type ApiErrorLike } from "@/lib/api-errors";
import { haversineDistanceM, isWithinRadius, validatePosition } from "@/lib/geo";
import { minskDayKey } from "@/lib/dates";
import { applyRankMonotonic, computeRank, type Rank } from "@/lib/ranks";
import { evaluateAchievements } from "@/lib/achievements";

// Модуль импортирует ApiError из api-errors, чтобы не тянуть next/server
// в код, переиспользуемый тестами.

export interface CheckinInput {
  placeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  positionTimestamp: number;
  idempotencyKey: string;
  tripId?: string;
}

export interface CheckinResult {
  visitId: string;
  placeId: string;
  zoneId: string;
  distanceM: number;
  repeatVisit: boolean;
  xpGained: number;
  rank: Rank;
  newlyReachedRanks: Rank[];
  achievementsAwarded: string[];
  jointVisitConfirmed: boolean;
}

const POSITION_ERROR_MESSAGES: Record<string, string> = {
  NOT_A_NUMBER: "Координаты имеют некорректный формат",
  OUT_OF_RANGE: "Координаты вне допустимого диапазона",
  NEGATIVE_ACCURACY: "Некорректная точность позиции",
  ACCURACY_TOO_LOW: "Слишком низкая точность позиции (нужна ≤100 м). Подойдите ближе или попробуйте на улице",
  POSITION_IN_FUTURE: "Позиция получена из будущего",
  POSITION_TOO_OLD: "Позиция устарела — обновите геолокацию и попробуйте снова",
};

function asApiErrorLike(e: unknown): e is ApiErrorLike {
  return typeof e === "object" && e !== null && "status" in e && "code" in e;
}

/**
 * Начисление XP через ledger: уникальный eventKey делает начисление
 * идемпотентным (повторный вызов не создаёт дубликат).
 * Возвращает true, если начисление выполнено впервые.
 */
async function awardOnce(
  tx: Prisma.TransactionClient,
  userId: string,
  eventKey: string,
  kind: Parameters<typeof tx.rewardEvent.create>[0]["data"]["kind"],
  xp: number,
  meta?: Record<string, unknown>,
): Promise<boolean> {
  const existing = await tx.rewardEvent.findUnique({ where: { eventKey } });
  if (existing) return false;
  try {
    await tx.rewardEvent.create({
      data: {
        userId,
        eventKey,
        kind,
        xp,
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return true;
  } catch (e) {
    // Гонка между параллельными транзакциями: кто-то успел раньше.
    if (asApiErrorLike(e) && e.code === "P2002") return false;
    throw e;
  }
}

function radiusForPlace(place: {
  category: PlaceCategory;
  radiusM: number | null;
}): number {
  return place.radiusM ?? CATEGORY_RADIUS_M[place.category] ?? DEFAULT_RADIUS_M;
}

/**
 * Серверное подтверждение посещения (раздел 7 ТЗ).
 * Вся проверка — на сервере; идентичность из сессии; координаты клиенту
 * не доверяются. Внутри одной транзакции: визит, прогресс зоны, ledger XP,
 * достижения.
 */
export async function performCheckin(
  userId: string,
  input: CheckinInput,
): Promise<CheckinResult> {
  const now = Date.now();

  const positionError = validatePosition(
    {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      positionTimestamp: input.positionTimestamp,
    },
    { now },
  );
  if (positionError) {
    throw new ApiError(422, `GEO_${positionError}`, POSITION_ERROR_MESSAGES[positionError]);
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 128) {
    throw new ApiError(400, "BAD_IDEMPOTENCY_KEY", "Некорректный ключ идемпотентности");
  }

  // Идемпотентный повтор того же запроса — возвращаем прежний результат.
  const sameKeyVisit = await prisma.visit.findUnique({
    where: { userId_checkinKey: { userId, checkinKey: input.idempotencyKey } },
  });
  if (sameKeyVisit) {
    return rebuildResultFromVisit(sameKeyVisit.id);
  }

  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    include: { zone: { include: { goldRequired: true } } },
  });
  if (!place || place.publicationStatus !== "PUBLISHED") {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Место не найдено");
  }

  const checkpoint = {
    lat: place.checkpointLat ?? place.lat,
    lon: place.checkpointLon ?? place.lon,
  };
  const distanceM = haversineDistanceM(
    { lat: input.latitude, lon: input.longitude },
    { lat: checkpoint.lat.toNumber(), lon: checkpoint.lon.toNumber() },
  );
  const radiusM = radiusForPlace(place);
  const within = isWithinRadius(
    { lat: input.latitude, lon: input.longitude },
    { lat: checkpoint.lat.toNumber(), lon: checkpoint.lon.toNumber() },
    radiusM,
    input.accuracy,
  );
  if (!within) {
    throw new ApiError(
      422,
      "FAR_FROM_PLACE",
      `Вы далеко от объекта (${Math.round(distanceM)} м, радиус ${radiusM} м). Подойдите ближе`,
    );
  }

  const visitDay = minskDayKey(now);

  // Строка прогресса должна существовать ДО транзакции: FOR UPDATE по
  // реальной строке сериализует конкурентные чек-ины без gap-lock дедлоков.
  try {
    await prisma.userZoneProgress.upsert({
      where: { userId_zoneId: { userId, zoneId: place.zoneId } },
      create: { userId, zoneId: place.zoneId },
      update: {},
    });
  } catch (e) {
    // Гонка двух первых чек-инов: строку создал параллельный запрос.
    if (!(asApiErrorLike(e) && e.code === "P2002")) throw e;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Блокируем строку прогресса зоны для сериализации конкурентных чек-инов
    // (до проверки дня — чтобы два параллельных запроса не проскочили вместе).
    await tx.$queryRaw`SELECT id FROM UserZoneProgress WHERE userId = ${userId} AND zoneId = ${place.zoneId} FOR UPDATE`;

    // Повторное посещение того же места в тот же день (Europe/Minsk)
    // не создаёт дубль и не даёт очков.
    const sameDayVisit = await tx.visit.findUnique({
      where: {
        userId_placeId_visitDay: { userId, placeId: place.id, visitDay },
      },
    });
    if (sameDayVisit) {
      if (sameDayVisit.checkinKey === input.idempotencyKey) {
        return {
          visitId: sameDayVisit.id,
          repeatVisit: true,
          xpGained: 0,
          newlyReachedRanks: [] as Rank[],
          achievementsAwarded: [] as string[],
        };
      }
      throw new ApiError(
        409,
        "ALREADY_VISITED_TODAY",
        "Это место уже отмечено сегодня. Повторная отметка станет доступна завтра",
      );
    }

    // Блокируем строку прогресса зоны для сериализации конкурентных чек-инов.
    const uniqueCountBefore = await tx.visit.count({
      where: { userId, placeId: place.id, isUniqueForUser: true },
    });
    const isUniqueForUser = uniqueCountBefore === 0;

    let visit;
    try {
      visit = await tx.visit.create({
        data: {
          userId,
          placeId: place.id,
          tripId: input.tripId ?? null,
          checkinLat: input.latitude,
          checkinLon: input.longitude,
          accuracyM: input.accuracy,
          distanceM,
          visitDay,
          isUniqueForUser,
          checkinKey: input.idempotencyKey,
        },
      });
    } catch (e) {
      // Гонка двух параллельных запросов в один день: уникальный индекс
      // (userId, placeId, visitDay) не даёт создать дубль.
      if (asApiErrorLike(e) && e.code === "P2002") {
        throw new ApiError(
          409,
          "ALREADY_VISITED_TODAY",
          "Это место уже отмечено сегодня. Повторная отметка станет доступна завтра",
        );
      }
      throw e;
    }

    let xpGained = 0;
    const newlyReachedRanks: Rank[] = [];

    if (isUniqueForUser) {
      const awarded = await awardOnce(
        tx,
        userId,
        `place_first:${userId}:${place.id}`,
        "PLACE_FIRST",
        XP.placeFirst,
        { placeId: place.id },
      );
      if (awarded) xpGained += XP.placeFirst;
    }

    // Прогресс зоны: пересчёт и монотонное применение рангов.
    const progress = await tx.userZoneProgress.upsert({
      where: { userId_zoneId: { userId, zoneId: place.zoneId } },
      create: { userId, zoneId: place.zoneId, uniquePlaces: isUniqueForUser ? 1 : 0 },
      update: isUniqueForUser ? { uniquePlaces: { increment: 1 } } : {},
    });

    const publishedPlaces = await tx.place.count({
      where: { zoneId: place.zoneId, publicationStatus: "PUBLISHED" },
    });
    const goldPlaceIds = place.zone.goldRequired.map((g) => g.placeId);
    const goldVisitedCount =
      goldPlaceIds.length === 0
        ? 0
        : await tx.visit.count({
            where: {
              userId,
              isUniqueForUser: true,
              placeId: { in: goldPlaceIds },
            },
          });

    const computed = computeRank({
      uniquePlaces: progress.uniquePlaces,
      silverThreshold: place.zone.silverThreshold,
      goldMinCount: place.zone.goldMinCount,
      goldRequiredAllVisited:
        goldPlaceIds.length > 0 && goldVisitedCount >= goldPlaceIds.length,
      hasPublishedPlaces: publishedPlaces > 0,
    });

    const { next, newlyReached } = applyRankMonotonic(progress.status, computed);
    if (newlyReached.length > 0) {
      const nowDate = new Date();
      const updateData: Record<string, unknown> = { status: next };
      if (next === "BRONZE" || newlyReached.includes("BRONZE")) {
        updateData.bronzeAt = progress.bronzeAt ?? nowDate;
      }
      if (newlyReached.includes("SILVER")) updateData.silverAt = nowDate;
      if (newlyReached.includes("GOLD")) updateData.goldAt = nowDate;
      await tx.userZoneProgress.update({
        where: { id: progress.id },
        data: updateData,
      });
      const rankXp: Record<"BRONZE" | "SILVER" | "GOLD", number> = {
        BRONZE: XP.zoneBronze,
        SILVER: XP.zoneSilver,
        GOLD: XP.zoneGold,
      };
      const kindByRank = {
        BRONZE: "ZONE_BRONZE",
        SILVER: "ZONE_SILVER",
        GOLD: "ZONE_GOLD",
      } as const;
      for (const rank of newlyReached) {
        const key = rank as "BRONZE" | "SILVER" | "GOLD";
        const awarded = await awardOnce(
          tx,
          userId,
          `zone_${rank.toLowerCase()}:${userId}:${place.zoneId}`,
          kindByRank[key],
          rankXp[key],
          { zoneId: place.zoneId },
        );
        if (awarded) xpGained += rankXp[key];
      }
      newlyReachedRanks.push(...newlyReached);
    }

    const achievementsAwarded = await evaluateAchievements(tx, userId);

    return {
      visitId: visit.id,
      repeatVisit: false,
      xpGained,
      newlyReachedRanks,
      achievementsAwarded,
    };
  });

  // Совместная поездка: связываем чек-ин с поездкой вне игровой транзакции.
  let jointVisitConfirmed = false;
  if (input.tripId) {
    jointVisitConfirmed = await registerTripConfirmation({
      userId,
      tripId: input.tripId,
      placeId: place.id,
      visitId: result.visitId,
      checkinLat: input.latitude,
      checkinLon: input.longitude,
    });
  }

  return {
    visitId: result.visitId,
    placeId: place.id,
    zoneId: place.zoneId,
    distanceM,
    repeatVisit: result.repeatVisit,
    xpGained: result.xpGained,
    rank: await currentRank(userId, place.zoneId),
    newlyReachedRanks: result.newlyReachedRanks,
    achievementsAwarded: result.achievementsAwarded,
    jointVisitConfirmed,
  };
}

async function currentRank(userId: string, zoneId: string): Promise<Rank> {
  const progress = await prisma.userZoneProgress.findUnique({
    where: { userId_zoneId: { userId, zoneId } },
  });
  return (progress?.status ?? "NONE") as Rank;
}

/** Восстановление результата идемпотентного повтора по сохранённому визиту. */
async function rebuildResultFromVisit(visitId: string): Promise<CheckinResult> {
  const visit = await prisma.visit.findUniqueOrThrow({
    where: { id: visitId },
    include: { place: { select: { id: true, zoneId: true } } },
  });
  const progress = await prisma.userZoneProgress.findUnique({
    where: { userId_zoneId: { userId: visit.userId, zoneId: visit.place.zoneId } },
  });
  return {
    visitId: visit.id,
    placeId: visit.place.id,
    zoneId: visit.place.zoneId,
    distanceM: visit.distanceM,
    repeatVisit: true,
    xpGained: 0,
    rank: (progress?.status ?? "NONE") as Rank,
    newlyReachedRanks: [],
    achievementsAwarded: [],
    jointVisitConfirmed: visit.jointVisitId !== null,
  };
}

/**
 * Регистрация подтверждения визита в совместной поездке (раздел 9 ТЗ):
 * только принявшие приглашение участники, после старта поездки, окно 2 часа.
 */
export async function registerTripConfirmation(args: {
  userId: string;
  tripId: string;
  placeId: string;
  visitId: string;
  checkinLat: number;
  checkinLon: number;
}): Promise<boolean> {
  const { userId, tripId, placeId, visitId } = args;
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new ApiError(404, "TRIP_NOT_FOUND", "Поездка не найдена");
  if (trip.status === "PLANNED") {
    throw new ApiError(422, "TRIP_NOT_STARTED", "Поездка ещё не началась");
  }
  if (trip.status !== "ACTIVE") {
    throw new ApiError(422, "TRIP_NOT_ACTIVE", "Поездка неактивна");
  }
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  if (!membership || membership.inviteStatus !== "ACCEPTED") {
    throw new ApiError(403, "NOT_TRIP_MEMBER", "Вы не участник этой поездки");
  }
  const required = await prisma.tripPlace.findUnique({
    where: { tripId_placeId: { tripId, placeId } },
  });
  if (!required) {
    throw new ApiError(422, "PLACE_NOT_IN_TRIP", "Место не входит в маршрут поездки");
  }

  return prisma.$transaction(async (tx) => {
    // Блокируем joint-запись для сериализации порога из двух подтверждений.
    const jointVisit = await tx.jointVisit.upsert({
      where: { tripId_placeId: { tripId, placeId } },
      create: { tripId, placeId },
      update: {},
    });

    const existing = await tx.jointVisitConfirmation.findUnique({
      where: { jointVisitId_userId: { jointVisitId: jointVisit.id, userId } },
    });
    if (existing) return jointVisit.confirmedAt !== null;

    // Связываем подтверждение с визитом того же дня, если он уже есть.
    let linkedVisitId: string | null = visitId;
    const dayVisit = await tx.visit.findUnique({
      where: {
        userId_placeId_visitDay: {
          userId,
          placeId,
          visitDay: minskDayKey(Date.now()),
        },
      },
    });
    if (dayVisit && dayVisit.id !== visitId) linkedVisitId = dayVisit.id;

    await tx.jointVisitConfirmation.create({
      data: {
        jointVisitId: jointVisit.id,
        userId,
        visitId: linkedVisitId,
        checkinLat: args.checkinLat,
        checkinLon: args.checkinLon,
      },
    });

    if (jointVisit.confirmedAt) return true;

    // Порог: минимум N подтверждений от принявших приглашение участников,
    // все после старта, разница в пределах окна.
    const confirmations = await tx.jointVisitConfirmation.findMany({
      where: { jointVisitId: jointVisit.id },
      include: {
        user: {
          select: {
            tripMemberships: {
              where: { tripId, inviteStatus: "ACCEPTED" },
              select: { userId: true },
            },
          },
        },
      },
    });
    const valid = confirmations
      .filter(
        (c) =>
          c.user.tripMemberships.length > 0 &&
          c.confirmedAt.getTime() >= (trip.startedAt ?? trip.createdAt).getTime(),
      )
      .map((c) => c.confirmedAt.getTime())
      .sort((a, b) => a - b);

    let meets = false;
    for (let i = 0; i + TRIP_RULES.jointConfirmationsRequired <= valid.length; i++) {
      const group = valid.slice(i, i + TRIP_RULES.jointConfirmationsRequired);
      if (group[group.length - 1] - group[0] <= TRIP_RULES.jointWindowMs) {
        meets = true;
        break;
      }
    }

    let completed = false;
    if (meets) {
      await tx.jointVisit.update({
        where: { id: jointVisit.id },
        data: { confirmedAt: new Date() },
      });

      // Проверяем выполнение совместной цели: все обязательные места отмечены.
      const requiredPlaces = await tx.tripPlace.findMany({
        where: { tripId, isRequired: true },
        select: { placeId: true },
      });
      const confirmedPlaces = await tx.jointVisit.findMany({
        where: { tripId, confirmedAt: { not: null } },
        select: { placeId: true },
      });
      const confirmedSet = new Set(confirmedPlaces.map((c) => c.placeId));
      const allRequiredDone =
        requiredPlaces.length > 0 &&
        requiredPlaces.every((p) => confirmedSet.has(p.placeId));
      if (allRequiredDone && trip.status === "ACTIVE") {
        await tx.trip.update({
          where: { id: tripId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        completed = true;

        // Командная награда: один раз, только участникам с хотя бы одним
        // совместно подтверждённым местом этой поездки.
        const participants = await tx.jointVisitConfirmation.findMany({
          where: { jointVisit: { tripId } },
          select: { userId: true },
          distinct: ["userId"],
        });
        for (const p of participants) {
          await awardOnce(
            tx,
            p.userId,
            `trip_completed:${tripId}:${p.userId}`,
            "TRIP_COMPLETED",
            XP.tripCompleted,
            { tripId },
          );
        }
      }
    }

    await evaluateAchievements(tx, userId);
    if (completed) {
      // Достижения остальных участников (командное приключение).
      const participants = await tx.jointVisitConfirmation.findMany({
        where: { jointVisit: { tripId } },
        select: { userId: true },
        distinct: ["userId"],
      });
      for (const p of participants) {
        await evaluateAchievements(tx, p.userId);
      }
    }
    return meets;
  });
}
