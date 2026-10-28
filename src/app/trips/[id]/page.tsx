import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Clock,
  Handshake,
  Info,
  MailQuestion,
  Route,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptedFriendIds, areFriends } from "@/lib/acl";
import {
  TripOrganizerActions,
  TripInviteForm,
  TripInviteRespond,
  LeaveTripButton,
  TripRouteEditor,
  TripPlaceRemove,
} from "@/components/trip-detail-actions";
import { CheckinButton } from "@/components/checkin-button";
import { CategoryTile } from "@/components/ui/category";
import { Alert, Avatar, Container, EmptyState, Pill, ProgressBar, Section } from "@/components/ui/primitives";
import { TripStatusPill } from "@/components/ui/trip-status";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Поездка" };

const INVITE = {
  PENDING: { label: "приглашён(а)", tone: "neutral" },
  ACCEPTED: { label: "участник", tone: "success" },
  DECLINED: { label: "отказался(ась)", tone: "danger" },
} as const;

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        include: { place: { select: { id: true, slug: true, name: true, category: true } } },
        orderBy: { sort: "asc" },
      },
    },
  });
  if (!trip) notFound();

  const isOrganizer = trip.organizerId === meId;
  const myMembership = trip.members.find((m) => m.userId === meId);
  // Поездку видят только организатор и приглашённые
  if (!isOrganizer && !myMembership) notFound();
  const isParticipant = myMembership?.inviteStatus === "ACCEPTED";

  const [jointVisits, tripEntries] = await Promise.all([
    prisma.jointVisit.findMany({
      where: { tripId: trip.id },
      include: {
        confirmations: {
          include: { user: { select: { displayName: true, username: true } } },
          orderBy: { confirmedAt: "asc" },
        },
      },
    }),
    prisma.diaryEntry.findMany({
      where: { tripId: trip.id },
      include: {
        author: { select: { displayName: true, username: true } },
        place: { select: { name: true } },
        photos: { select: { previewKey: true }, orderBy: { sort: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const jointByPlace = new Map(jointVisits.map((j) => [j.placeId, j]));

  // Записи участников показываются с учётом их собственных настроек видимости
  const visibleEntries: typeof tripEntries = [];
  for (const e of tripEntries) {
    if (
      e.authorId === meId ||
      e.visibility === "PUBLIC" ||
      (e.visibility === "FRIENDS" && (await areFriends(meId, e.authorId)))
    ) {
      visibleEntries.push(e);
    }
  }

  const canEditRoute = trip.status === "PLANNED" && isOrganizer;
  const canInvite = isOrganizer && (trip.status === "PLANNED" || trip.status === "ACTIVE");
  const routeIds = new Set(trip.places.map((p) => p.placeId));
  const memberIds = new Set(trip.members.map((m) => m.userId));

  const [allPlaces, invitableFriends] = await Promise.all([
    canEditRoute
      ? prisma.place.findMany({
          where: { publicationStatus: "PUBLISHED", id: { notIn: [...routeIds] } },
          select: { id: true, name: true, zone: { select: { name: true } } },
          orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
        })
      : Promise.resolve([]),
    canInvite
      ? acceptedFriendIds(meId).then((ids) =>
          prisma.user.findMany({
            where: { id: { in: ids.filter((x) => !memberIds.has(x)) } },
            select: { username: true, displayName: true },
            orderBy: { displayName: "asc" },
          }),
        )
      : Promise.resolve([]),
  ]);

  const required = trip.places.filter((p) => p.isRequired);
  const confirmedCount = required.filter((p) => jointByPlace.get(p.placeId)?.confirmedAt).length;
  const acceptedMembers = trip.members.filter((m) => m.inviteStatus === "ACCEPTED");
  const demoEnabled = process.env.NODE_ENV !== "production" && process.env.DEMO_GEO_ENABLED === "true";

  return (
    <Container>
      <Link href="/trips" className="btn btn-subtle btn-sm -ml-3 mb-4">
        <ArrowLeft className="size-4" />
        Поездки
      </Link>

      <header className="card relative mb-6 overflow-hidden p-6 sm:p-8">
        <Route className="absolute -right-6 -bottom-8 size-48 text-forest-50" aria-hidden />
        <div className="relative">
          <TripStatusPill status={trip.status} />
          <h1 className="mt-3 font-display text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {trip.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDate(trip.tripDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              Организатор: {trip.organizer.displayName}
            </span>
            {trip.startedAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                Старт {formatDateTime(trip.startedAt)}
              </span>
            )}
          </div>
          {trip.description && (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-zinc-700">
              {trip.description}
            </p>
          )}
          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Handshake className="size-4 text-forest-600" />
                Совместная цель
              </span>
              <span className="text-zinc-500">
                {confirmedCount} из {required.length} мест
              </span>
            </div>
            <ProgressBar value={confirmedCount} max={Math.max(1, required.length)} className="h-2.5" label="Совместная цель" />
            {trip.status === "COMPLETED" && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                <CircleCheck className="size-4" />
                Цель выполнена — команда получила награду
              </p>
            )}
          </div>
        </div>
      </header>

      {myMembership?.inviteStatus === "PENDING" && (
        <section className="card mb-6 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-sky-900">
            <MailQuestion className="size-[18px]" />
            {trip.organizer.displayName} приглашает вас в поездку
          </h2>
          <p className="mt-1 mb-4 text-sm text-sky-900/70">
            Примите приглашение, чтобы отмечать места маршрута вместе с остальными.
          </p>
          <div className="max-w-sm">
            <TripInviteRespond tripId={trip.id} />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={`Маршрут · ${trip.places.length}`} icon={Route}>
            {trip.status === "ACTIVE" && isParticipant && (
              <Alert tone="info" icon={Info} className="mb-4">
                Каждый отмечается сам, на месте. Место становится совместным, когда минимум двое участников
                подтвердят его с разницей не больше 2 часов.
              </Alert>
            )}
            {canEditRoute && (
              <div className="mb-4">
                <TripRouteEditor
                  tripId={trip.id}
                  allPlaces={allPlaces.map((p) => ({ id: p.id, name: p.name, zoneName: p.zone.name }))}
                />
              </div>
            )}

            {trip.places.length === 0 ? (
              <EmptyState
                icon={Route}
                title="Маршрут пуст"
                text={canEditRoute ? "Добавьте места, которые хотите посетить вместе." : "Организатор ещё не добавил места."}
                className="border-0 bg-zinc-50 py-8"
              />
            ) : (
              <ol className="relative flex flex-col gap-3">
                {trip.places.map((tp, i) => {
                  const jv = jointByPlace.get(tp.placeId);
                  const confirmed = !!jv?.confirmedAt;
                  const myConfirm = jv?.confirmations.some((c) => c.user.username === session.user.username);
                  return (
                    <li
                      key={tp.id}
                      className={cn(
                        "rounded-2xl border p-4 transition",
                        confirmed ? "border-forest-200 bg-forest-50/50" : "border-zinc-200 bg-white",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
                            confirmed ? "bg-forest-700 text-white" : "bg-zinc-100 text-zinc-500",
                          )}
                        >
                          {confirmed ? <Handshake className="size-4" /> : i + 1}
                        </span>
                        <CategoryTile category={tp.place.category} className="size-10" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/places/${tp.place.slug}`} className="block truncate text-sm font-semibold hover:underline">
                            {tp.place.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {confirmed ? (
                              <Pill tone="success" className="py-0.5 text-[11px]">
                                Совместно · {formatDateTime(jv!.confirmedAt!)}
                              </Pill>
                            ) : jv && jv.confirmations.length > 0 ? (
                              <Pill tone="info" className="py-0.5 text-[11px]">
                                Отметок: {jv.confirmations.length} из 2
                              </Pill>
                            ) : (
                              <span className="text-xs text-zinc-400">Пока без отметок</span>
                            )}
                            {!tp.isRequired && <span className="text-xs text-zinc-400">необязательное</span>}
                          </div>
                        </div>
                        {canEditRoute && <TripPlaceRemove tripId={trip.id} placeId={tp.placeId} />}
                      </div>

                      {jv && jv.confirmations.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 pl-11">
                          <div className="flex -space-x-1.5">
                            {jv.confirmations.map((c) => (
                              <Avatar
                                key={c.id}
                                name={c.user.displayName}
                                seed={c.user.username}
                                className="size-6 text-[9px] ring-2 ring-white"
                              />
                            ))}
                          </div>
                          <span className="truncate text-xs text-zinc-500">
                            {jv.confirmations.map((c) => c.user.displayName).join(", ")}
                          </span>
                        </div>
                      )}

                      {trip.status === "ACTIVE" && isParticipant && !confirmed && (
                        <div className="mt-4 sm:pl-11">
                          {myConfirm ? (
                            <p className="flex items-center gap-1.5 text-sm font-medium text-forest-700">
                              <CircleCheck className="size-4" />
                              Вы отметились — ждём остальных
                            </p>
                          ) : (
                            <CheckinButton
                              placeId={tp.placeId}
                              authorized
                              demoEnabled={demoEnabled}
                              visitedToday={false}
                              tripId={trip.id}
                              compact
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          <Section title={`Записи участников · ${visibleEntries.length}`} icon={BookOpen}>
            {visibleEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Здесь появятся записи дневника участников, привязанные к этой поездке (с учётом их настроек
                видимости).
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {visibleEntries.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/diary/${e.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-zinc-100 p-2.5 transition hover:border-zinc-200 hover:bg-zinc-50"
                    >
                      <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {e.photos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/files/${e.photos[0].previewKey}`} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center text-zinc-300">
                            <BookOpen className="size-6" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.title}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {e.author.displayName} · {e.place.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {isParticipant && (
              <Link href={`/diary/new?trip=${trip.id}`} className="btn btn-secondary btn-sm mt-4">
                <BookOpen className="size-4" />
                Добавить запись о поездке
              </Link>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Section title={`Участники · ${acceptedMembers.length}`} icon={Users}>
            <ul className="flex flex-col gap-3">
              {trip.members.map((m) => {
                const inv = INVITE[m.inviteStatus];
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.user.displayName} seed={m.user.username} />
                    <Link href={`/users/${m.user.username}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold hover:underline">
                        {m.user.displayName}
                        {m.userId === trip.organizerId && (
                          <span className="font-normal text-zinc-400"> · организатор</span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">@{m.user.username}</span>
                    </Link>
                    <Pill tone={inv.tone} className="py-0.5 text-[11px]">
                      {inv.label}
                    </Pill>
                  </li>
                );
              })}
            </ul>
            {canInvite && (
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <p className="mb-2 text-xs font-semibold text-zinc-500">Пригласить друга</p>
                <TripInviteForm tripId={trip.id} friends={invitableFriends} />
              </div>
            )}
            {isOrganizer && trip.status === "PLANNED" && (
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <TripOrganizerActions tripId={trip.id} canStart={required.length > 0} />
              </div>
            )}
            {isParticipant && !isOrganizer && (trip.status === "PLANNED" || trip.status === "ACTIVE") && (
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <LeaveTripButton tripId={trip.id} />
                <p className="hint mt-2 text-center">Личный прогресс при выходе сохранится.</p>
              </div>
            )}
          </Section>
        </aside>
      </div>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
