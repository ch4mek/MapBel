// Данные профиля: XP, уровень, зоны, достижения, альбом с учётом видимости.

import { prisma } from "@/lib/prisma";
import { levelForXp, ACHIEVEMENTS } from "@/config/game";
import { minskMonthRange } from "@/lib/dates";
import { areFriends } from "@/lib/acl";
import type { Rank } from "@/lib/ranks";

export interface ProfileData {
  user: { id: string; displayName: string; username: string; createdAt: Date; bio: string | null; homeCity: string | null };
  lifetimeXp: number;
  level: number;
  monthXp: number;
  uniquePlaces: number;
  zonesUnlocked: number;
  goldCount: number;
  visitsTotal: number;
  zoneProgress: {
    zoneId: string;
    zoneSlug: string;
    zoneName: string;
    status: Rank;
    uniquePlaces: number;
    publishedPlaces: number;
  }[];
  achievements: { id: string; name: string; description: string; icon: string; awardedAt: Date | null }[];
  album: {
    entryId: string;
    title: string;
    previewKey: string;
    caption: string | null;
    placeName: string;
    tripDate: Date | null;
  }[];
  entriesCount: number;
  friendsCount: number;
}

export async function getProfileData(
  targetUserId: string,
  viewerId: string | null,
): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { profile: true },
  });
  if (!user) return null;

  const isSelf = viewerId === user.id;
  const friends = viewerId && !isSelf ? await areFriends(viewerId, user.id) : false;

  const month = minskMonthRange(Date.now());
  const [xpAgg, monthAgg, uniquePlaces, zonesUnlocked, goldCount, visitsTotal, progresses, allAwards, entries] =
    await Promise.all([
      prisma.rewardEvent.aggregate({ where: { userId: user.id }, _sum: { xp: true } }),
      prisma.rewardEvent.aggregate({
        where: {
          userId: user.id,
          createdAt: { gte: month.start, lt: month.end },
        },
        _sum: { xp: true },
      }),
      prisma.visit.count({ where: { userId: user.id, isUniqueForUser: true } }),
      prisma.userZoneProgress.count({ where: { userId: user.id, status: { not: "NONE" } } }),
      prisma.userZoneProgress.count({ where: { userId: user.id, status: "GOLD" } }),
      prisma.visit.count({ where: { userId: user.id } }),
      prisma.userZoneProgress.findMany({
        where: { userId: user.id, status: { not: "NONE" } },
        include: {
          zone: {
            select: {
              id: true,
              slug: true,
              name: true,
              _count: { select: { places: { where: { publicationStatus: "PUBLISHED" } } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.userAchievement.findMany({ where: { userId: user.id } }),
      prisma.diaryEntry.findMany({
        where: {
          authorId: user.id,
          visibility: isSelf
            ? undefined
            : friends
              ? { in: ["PUBLIC", "FRIENDS"] }
              : "PUBLIC",
        },
        include: {
          place: { select: { name: true } },
          photos: { orderBy: { sort: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: isSelf ? 60 : 24,
      }),
    ]);

  const friendsCount = await prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
  });

  const awardedMap = new Map(allAwards.map((a) => [a.achievementId, a.awardedAt]));

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      createdAt: user.createdAt,
      bio: user.profile?.bio ?? null,
      homeCity: user.profile?.homeCity ?? null,
    },
    lifetimeXp: xpAgg._sum.xp ?? 0,
    level: levelForXp(xpAgg._sum.xp ?? 0),
    monthXp: monthAgg._sum?.xp ?? 0,
    uniquePlaces,
    zonesUnlocked,
    goldCount,
    visitsTotal,
    zoneProgress: progresses.map((p) => ({
      zoneId: p.zone.id,
      zoneSlug: p.zone.slug,
      zoneName: p.zone.name,
      status: p.status as Rank,
      uniquePlaces: p.uniquePlaces,
      publishedPlaces: p.zone._count.places,
    })),
    achievements: ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      awardedAt: awardedMap.get(a.id) ?? null,
    })),
    album: entries.flatMap((e) =>
      e.photos.length === 0
        ? []
        : [
            {
              entryId: e.id,
              title: e.title,
              previewKey: e.photos[0].previewKey,
              caption: e.photos[0].caption,
              placeName: e.place.name,
              tripDate: e.tripDate,
            },
          ],
    ),
    entriesCount: entries.length,
    friendsCount,
  };
}
