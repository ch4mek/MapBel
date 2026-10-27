// Оценка и выдача достижений (раздел 10 ТЗ). Каждое достижение — однократно,
// защита через уникальность userId+achievementId.

import type { Prisma } from "@/generated/prisma/client";
import { ACHIEVEMENTS, type AchievementCondition } from "@/config/game";

async function countAchievementUsers(
  tx: Prisma.TransactionClient,
  condition: AchievementCondition,
  userId: string,
): Promise<boolean> {
  switch (condition.type) {
    case "unique_places": {
      const n = await tx.visit.count({
        where: { userId, isUniqueForUser: true },
      });
      return n >= condition.count;
    }
    case "zones_unlocked": {
      const n = await tx.userZoneProgress.count({
        where: { userId, status: { not: "NONE" } },
      });
      return n >= condition.count;
    }
    case "gold_first": {
      const n = await tx.userZoneProgress.count({
        where: { userId, status: "GOLD" },
      });
      return n >= 1;
    }
    case "category_places": {
      const n = await tx.visit.count({
        where: {
          userId,
          isUniqueForUser: true,
          place: { category: { in: condition.categories } },
        },
      });
      return n >= condition.count;
    }
    case "first_joint_visit": {
      const n = await tx.jointVisitConfirmation.count({ where: { userId } });
      return n >= 1;
    }
    case "first_trip_completed": {
      const n = await tx.rewardEvent.count({
        where: { userId, kind: "TRIP_COMPLETED" },
      });
      return n >= 1;
    }
  }
}

/**
 * Проверяет все достижения и выдаёт невыданные. Возвращает список id
 * новых достижений. Безопасно вызывать повторно.
 */
export async function evaluateAchievements(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<string[]> {
  const existing = await tx.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const have = new Set(existing.map((a) => a.achievementId));
  const awarded: string[] = [];

  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    const met = await countAchievementUsers(tx, def.condition, userId);
    if (!met) continue;
    try {
      await tx.userAchievement.create({
        data: { userId, achievementId: def.id },
      });
      awarded.push(def.id);
    } catch {
      // Уникальный ключ уже защитил от повторной выдачи в гонке.
    }
  }
  return awarded;
}
