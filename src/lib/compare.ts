// Сравнение прогресса с друзьями (раздел 9 ТЗ): без глобального рейтинга.
// Tie-breaker для равных очков месяца: раньше первое начисление XP за
// месяц → выше; при равенстве — по username.

import { prisma } from "@/lib/prisma";
import { minskMonthRange } from "@/lib/dates";

export interface CompareRow {
  userId: string;
  displayName: string;
  username: string;
  isMe: boolean;
  zonesUnlocked: number;
  uniquePlaces: number;
  goldCount: number;
  monthXp: number;
}

async function statsFor(userId: string) {
  const month = minskMonthRange(Date.now());
  const [zones, places, gold, monthAgg] = await Promise.all([
    prisma.userZoneProgress.count({ where: { userId, status: { not: "NONE" } } }),
    prisma.visit.count({ where: { userId, isUniqueForUser: true } }),
    prisma.userZoneProgress.count({ where: { userId, status: "GOLD" } }),
    prisma.rewardEvent.findMany({
      where: { userId, createdAt: { gte: month.start, lt: month.end } },
      select: { xp: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const monthXp = monthAgg.reduce((s, r) => s + r.xp, 0);
  return {
    zonesUnlocked: zones,
    uniquePlaces: places,
    goldCount: gold,
    monthXp,
    firstXpAt: monthAgg[0]?.createdAt.getTime() ?? Number.MAX_SAFE_INTEGER,
  };
}

export async function compareWithFriends(meId: string): Promise<CompareRow[]> {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: meId }, { addresseeId: meId }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === meId ? f.addresseeId : f.requesterId,
  );

  const users = await prisma.user.findMany({
    where: { id: { in: [meId, ...friendIds] } },
    select: { id: true, displayName: true, username: true },
  });

  const rows: (CompareRow & { firstXpAt: number })[] = [];
  for (const u of users) {
    const s = await statsFor(u.id);
    rows.push({
      userId: u.id,
      displayName: u.displayName,
      username: u.username,
      isMe: u.id === meId,
      ...s,
    });
  }

  rows.sort(
    (a, b) =>
      b.monthXp - a.monthXp ||
      a.firstXpAt - b.firstXpAt ||
      a.username.localeCompare(b.username),
  );
  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    username: r.username,
    isMe: r.isMe,
    zonesUnlocked: r.zonesUnlocked,
    uniquePlaces: r.uniquePlaces,
    goldCount: r.goldCount,
    monthXp: r.monthXp,
  }));
}
