import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { respondTripInviteAction } from "@/lib/actions/social";
import { FriendActions } from "@/components/friend-actions";


const STATUS_RU: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: "Запланирована", cls: "!border-sky-500 !text-sky-700" },
  ACTIVE: { label: "Идёт", cls: "!border-emerald-600 !text-emerald-700" },
  COMPLETED: { label: "Завершена", cls: "!border-amber-500 !text-amber-700" },
  CANCELLED: { label: "Отменена", cls: "!border-red-400 !text-red-600" },
};

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const trips = await prisma.trip.findMany({
    where: { members: { some: { userId: meId } } },
    include: {
      organizer: { select: { displayName: true } },
      members: { where: { inviteStatus: "ACCEPTED" }, select: { userId: true } },
      places: { select: { placeId: true } },
    },
    orderBy: { tripDate: "desc" },
  });

  const pendingInvites = await prisma.tripMember.findMany({
    where: { userId: meId, inviteStatus: "PENDING" },
    include: { trip: { include: { organizer: { select: { displayName: true } } } } },
  });

  // Совместно подтверждённые места по каждой поездке
  const jointCounts = await prisma.jointVisit.groupBy({
    by: ["tripId"],
    where: { trip: { members: { some: { userId: meId } } }, confirmedAt: { not: null } },
    _count: { placeId: true },
  });
  const jointByTrip = new Map(jointCounts.map((j) => [j.tripId, j._count.placeId]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Поездки</h1>
        <Link href="/trips/new" className="btn btn-primary">
          ➕ Создать поездку
        </Link>
      </div>

      {pendingInvites.length > 0 && (
        <section className="card border-sky-300 p-4">
          <h2 className="text-base font-semibold">Приглашения ({pendingInvites.length})</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span>
                  «{inv.trip.title}» от {inv.trip.organizer.displayName} ·{" "}
                  {inv.trip.tripDate.toLocaleDateString("ru-RU")}
                </span>
                <FriendActions
                  kind="respond"
                  respond={async (accept) => {
                    "use server";
                    return respondTripInviteAction(inv.tripId, accept);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {trips.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--muted)]">
          Поездок пока нет. Создайте свою и пригласите друзей.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {trips.map((t) => {
            const st = STATUS_RU[t.status];
            const myMembership = t.members.some((m) => m.userId === meId);
            return (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`} className="card block p-4 hover:shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{t.title}</h2>
                    <span className={`chip ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t.tripDate.toLocaleDateString("ru-RU")} · организатор:{" "}
                    {t.organizer.displayName}
                    {!myMembership && " (ожидаем вашего ответа)"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Участников: {t.members.length} · мест в маршруте: {t.places.length} ·
                    совместно отмечено: {jointByTrip.get(t.id) ?? 0}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
