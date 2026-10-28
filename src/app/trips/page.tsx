import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Handshake, MailOpen, MapPin, Plus, Route } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { respondTripInviteAction } from "@/lib/actions/social";
import { FriendActions } from "@/components/friend-actions";
import { Avatar, Container, EmptyState, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { TripStatusPill } from "@/components/ui/trip-status";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Поездки" };

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const [trips, pendingInvites, jointCounts] = await Promise.all([
    prisma.trip.findMany({
      where: { members: { some: { userId: meId, inviteStatus: "ACCEPTED" } } },
      include: {
        organizer: { select: { displayName: true } },
        members: {
          where: { inviteStatus: "ACCEPTED" },
          include: { user: { select: { displayName: true, username: true } } },
        },
        places: { where: { isRequired: true }, select: { placeId: true } },
      },
      orderBy: { tripDate: "desc" },
    }),
    prisma.tripMember.findMany({
      where: { userId: meId, inviteStatus: "PENDING" },
      include: {
        trip: {
          include: {
            organizer: { select: { displayName: true, username: true } },
            _count: { select: { places: true } },
          },
        },
      },
    }),
    prisma.jointVisit.groupBy({
      by: ["tripId"],
      where: { trip: { members: { some: { userId: meId } } }, confirmedAt: { not: null } },
      _count: { placeId: true },
    }),
  ]);
  const jointByTrip = new Map(jointCounts.map((j) => [j.tripId, j._count.placeId]));

  const order = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2, CANCELLED: 3 } as const;
  const sorted = [...trips].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <Container>
      <PageHeader
        title="Поездки"
        subtitle="Планируйте маршрут с друзьями и открывайте места вместе"
        icon={Route}
        actions={
          <Link href="/trips/new" className="btn btn-primary">
            <Plus className="size-4" />
            Новая поездка
          </Link>
        }
      />

      {pendingInvites.length > 0 && (
        <section className="card mb-6 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-sky-900">
            <MailOpen className="size-[18px]" />
            Вас приглашают · {pendingInvites.length}
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <Avatar name={inv.trip.organizer.displayName} seed={inv.trip.organizer.username} />
                <Link href={`/trips/${inv.tripId}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold hover:underline">{inv.trip.title}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {inv.trip.organizer.displayName} · {formatDate(inv.trip.tripDate)} · {inv.trip._count.places} мест
                  </span>
                </Link>
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

      {sorted.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Поездок пока нет"
          text="Соберите маршрут из нескольких мест и пригласите друзей. Места, где вы отметитесь вместе, станут совместными."
          action={
            <Link href="/trips/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" />
              Создать поездку
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorted.map((t) => {
            const joint = jointByTrip.get(t.id) ?? 0;
            const required = t.places.length;
            return (
              <li key={t.id}>
                <Link
                  href={`/trips/${t.id}`}
                  className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg leading-snug font-semibold text-zinc-900">{t.title}</h2>
                    <TripStatusPill status={t.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-4" />
                      {formatDate(t.tripDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {required} обяз. мест
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-700">
                        <Handshake className="size-3.5" />
                        Совместно отмечено
                      </span>
                      <span className="text-zinc-500">
                        {joint} из {required}
                      </span>
                    </div>
                    <ProgressBar value={joint} max={Math.max(1, required)} label="Совместная цель" />
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <div className="flex -space-x-2">
                      {t.members.slice(0, 5).map((m) => (
                        <Avatar
                          key={m.id}
                          name={m.user.displayName}
                          seed={m.user.username}
                          className="size-8 text-[10px] ring-2 ring-white"
                        />
                      ))}
                      {t.members.length > 5 && (
                        <span className="grid size-8 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 ring-2 ring-white">
                          +{t.members.length - 5}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="size-5 text-zinc-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
