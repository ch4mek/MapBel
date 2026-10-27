import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/acl";
import { PLACE_CATEGORY_ICONS } from "@/lib/place-meta";
import {
  TripOrganizerActions,
  TripInviteForm,
  TripInviteRespond,
  LeaveTripButton,
  TripRouteEditor,
  TripPlaceRemove,
} from "@/components/trip-detail-actions";
import { CheckinButton } from "@/components/checkin-button";
import { prisma as db } from "@/lib/prisma";


const STATUS_RU: Record<string, string> = {
  PLANNED: "Запланирована",
  ACTIVE: "Идёт",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

const INVITE_RU: Record<string, string> = {
  PENDING: "ждёт ответа",
  ACCEPTED: "участник",
  DECLINED: "отклонил",
};

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, displayName: true, username: true } },
      members: {
        include: { user: { select: { id: true, displayName: true, username: true } } },
        orderBy: { invitedAt: "asc" },
      },
      places: {
        include: {
          place: { select: { id: true, slug: true, name: true, category: true } },
        },
        orderBy: { sort: "asc" },
      },
    },
  });
  if (!trip) notFound();

  const isOrganizer = trip.organizerId === meId;
  const myMembership = trip.members.find((m) => m.userId === meId);
  // Просмотр доступен организатору и тем, кого пригласили.
  if (!isOrganizer && !myMembership) notFound();

  const jointVisits = await db.jointVisit.findMany({
    where: { tripId: trip.id },
    include: {
      confirmations: {
        include: { user: { select: { displayName: true } } },
        orderBy: { confirmedAt: "asc" },
      },
    },
  });
  const jointByPlace = new Map(jointVisits.map((j) => [j.placeId, j]));

  // Записи дневника участников, привязанные к поездке, с учётом видимости
  const tripEntries = await db.diaryEntry.findMany({
    where: { tripId: trip.id },
    include: {
      author: { select: { displayName: true, username: true } },
      place: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const visibleEntries = [];
  for (const e of tripEntries) {
    if (e.authorId === meId) visibleEntries.push(e);
    else if (e.visibility === "PUBLIC") visibleEntries.push(e);
    else if (
      e.visibility === "FRIENDS" &&
      (await areFriends(meId, e.authorId))
    ) {
      visibleEntries.push(e);
    }
  }

  const allPlaces =
    trip.status === "PLANNED" && isOrganizer
      ? await db.place.findMany({
          where: { publicationStatus: "PUBLISHED" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const requiredTotal = trip.places.filter((p) => p.isRequired).length;
  const confirmedCount = trip.places.filter((p) => {
    const j = jointByPlace.get(p.placeId);
    return j?.confirmedAt != null;
  }).length;

  const demoEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.DEMO_GEO_ENABLED === "true";

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-[var(--muted)]">
        <Link href="/trips" className="hover:underline">
          Поездки
        </Link>{" "}
        / <span>{trip.title}</span>
      </nav>

      <header className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">🚩 {trip.title}</h1>
          <span className="chip">{STATUS_RU[trip.status]}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Дата: {trip.tripDate.toLocaleDateString("ru-RU")} · организатор:{" "}
          <Link href={`/users/${trip.organizer.username}`} className="underline">
            {trip.organizer.displayName}
          </Link>
          {trip.startedAt &&
            ` · старт: ${trip.startedAt.toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })}`}
          {trip.completedAt &&
            ` · завершена: ${trip.completedAt.toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })}`}
        </p>
        {trip.description && <p className="mt-2 text-sm">{trip.description}</p>}
        <p className="mt-2 text-sm">
          Совместная цель: <b>{confirmedCount}</b> из <b>{requiredTotal}</b>{" "}
          обязательных мест имеют совместную отметку.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card p-4">
          <h2 className="text-base font-semibold">Маршрут</h2>
          {trip.status === "PLANNED" && isOrganizer && (
            <div className="mt-2">
              <TripRouteEditor tripId={trip.id} allPlaces={allPlaces} />
            </div>
          )}
          <ol className="mt-3 flex flex-col gap-3">
            {trip.places.map((tp, i) => {
              const jv = jointByPlace.get(tp.placeId);
              const confirmed = jv?.confirmedAt != null;
              const myConfirm = jv?.confirmations.find((c) => c.userId === meId);
              return (
                <li key={tp.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {i + 1}. {PLACE_CATEGORY_ICONS[tp.place.category]}{" "}
                      <Link href={`/places/${tp.place.slug}`} className="underline">
                        {tp.place.name}
                      </Link>
                    </span>
                    {tp.isRequired && <span className="chip">обязательное</span>}
                    {confirmed ? (
                      <span className="chip !border-emerald-600 !text-emerald-700">
                        🤝 совместно {jv?.confirmedAt?.toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })}
                      </span>
                    ) : jv && jv.confirmations.length > 0 ? (
                      <span className="chip !border-sky-500 !text-sky-700">
                        подтверждений: {jv.confirmations.length}/2
                      </span>
                    ) : (
                      <span className="chip">нет отметок</span>
                    )}
                    {trip.status === "PLANNED" && isOrganizer && (
                      <TripPlaceRemove tripId={trip.id} placeId={tp.placeId} />
                    )}
                  </div>
                  {jv && jv.confirmations.length > 0 && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Подтвердили: {jv.confirmations.map((c) => c.user.displayName).join(", ")}
                    </p>
                  )}
                  {trip.status === "ACTIVE" &&
                    myMembership?.inviteStatus === "ACCEPTED" && (
                      <div className="mt-2 max-w-md">
                        <CheckinButton
                          placeId={tp.placeId}
                          authorized
                          demoEnabled={demoEnabled}
                          visitedToday={!!myConfirm}
                          tripId={trip.id}
                        />
                      </div>
                    )}
                </li>
              );
            })}
            {trip.places.length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                Маршрут пуст. {trip.status !== "PLANNED" && "Пустая поездка не может быть завершена."}
              </li>
            )}
          </ol>
        </section>

        <div className="flex flex-col gap-4">
          <section className="card p-4">
            <h2 className="text-base font-semibold">Участники ({trip.members.length})</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {trip.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/users/${m.user.username}`} className="underline">
                    {m.user.displayName}
                  </Link>
                  <span className="text-xs text-[var(--muted)]">
                    @{m.user.username} · {INVITE_RU[m.inviteStatus]}
                  </span>
                </li>
              ))}
            </ul>
            {isOrganizer && trip.status !== "CANCELLED" && trip.status !== "COMPLETED" && (
              <div className="mt-3">
                <TripInviteForm tripId={trip.id} />
              </div>
            )}
            {myMembership?.inviteStatus === "PENDING" && (
              <div className="mt-3">
                <p className="text-sm">Вас пригласили. Примите участие:</p>
                <div className="mt-1">
                  <TripInviteRespond tripId={trip.id} />
                </div>
              </div>
            )}
            {myMembership?.inviteStatus === "ACCEPTED" &&
              !isOrganizer &&
              trip.status !== "CANCELLED" && (
                <div className="mt-3">
                  <LeaveTripButton tripId={trip.id} />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Личный прогресс при выходе не откатывается.
                  </p>
                </div>
              )}
            {isOrganizer && trip.status === "PLANNED" && (
              <div className="mt-3 border-t pt-3">
                <TripOrganizerActions tripId={trip.id} />
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-base font-semibold">
              Записи участников ({visibleEntries.length})
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Показываются записи участников с учётом их настроек видимости.
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {visibleEntries.map((e) => (
                <li key={e.id}>
                  <Link href={`/diary/${e.id}`} className="underline">
                    {e.title}
                  </Link>{" "}
                  <span className="text-[var(--muted)]">
                    — {e.author.displayName}, {e.place.name}
                  </span>
                </li>
              ))}
              {visibleEntries.length === 0 && (
                <li className="text-[var(--muted)]">Пока нет доступных записей.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
