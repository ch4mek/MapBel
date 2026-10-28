import { Suspense } from "react";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { levelForXp } from "@/config/game";
import { AppNav, AppNavSkeleton } from "@/components/app-nav";

/**
 * Сессия читается внутри Suspense-границы: корневой layout остаётся
 * пригодным для пререндера, а шапка дорендеривается, когда сессия известна.
 */
async function NavData() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return <AppNav user={null} />;

  const [xpAgg, pendingFriends, pendingTrips, pendingTags] = await Promise.all([
    prisma.rewardEvent.aggregate({ where: { userId: session.user.id }, _sum: { xp: true } }),
    prisma.friendship.count({ where: { addresseeId: session.user.id, status: "PENDING" } }),
    prisma.tripMember.count({ where: { userId: session.user.id, inviteStatus: "PENDING" } }),
    prisma.photoTag.count({ where: { taggedUserId: session.user.id, status: "PENDING" } }),
  ]);
  const xp = xpAgg._sum.xp ?? 0;

  return (
    <AppNav
      user={{
        displayName: session.user.name ?? session.user.username,
        username: session.user.username,
        role: session.user.role,
        level: levelForXp(xp),
        xp,
      }}
      badges={{ friends: pendingFriends, trips: pendingTrips, diary: pendingTags }}
    />
  );
}

export function AppNavContainer() {
  return (
    <Suspense fallback={<AppNavSkeleton />}>
      <NavData />
    </Suspense>
  );
}
