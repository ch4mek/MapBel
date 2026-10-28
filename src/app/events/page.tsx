import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Ban, CalendarDays, Clock, ExternalLink, Filter, History, MapPin, User, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Container, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { shortZoneName } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "События" };

type EventRow = Awaited<ReturnType<typeof loadEvents>>[number];

function loadEvents(sp: { zone?: string; from?: string; to?: string }) {
  return prisma.event.findMany({
    where: {
      ...(sp.zone ? { place: { zoneId: sp.zone } } : {}),
      ...(sp.from || sp.to
        ? {
            startsAt: {
              ...(sp.from ? { gte: new Date(sp.from) } : {}),
              ...(sp.to ? { lte: new Date(sp.to + "T23:59:59") } : {}),
            },
          }
        : {}),
    },
    include: { place: { select: { name: true, slug: true, zone: { select: { name: true } } } } },
    orderBy: { startsAt: "asc" },
  });
}

function EventCard({ e, kind }: { e: EventRow; kind: "upcoming" | "cancelled" | "past" }) {
  const tz = e.timezone || "Europe/Minsk";
  const day = e.startsAt.toLocaleDateString("ru-RU", { day: "numeric", timeZone: tz });
  const month = e.startsAt.toLocaleDateString("ru-RU", { month: "short", timeZone: tz }).replace(".", "");
  const time = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const sameDay =
    e.startsAt.toLocaleDateString("ru-RU", { timeZone: tz }) === e.endsAt.toLocaleDateString("ru-RU", { timeZone: tz });

  return (
    <li className={cn("card flex gap-4 p-4 sm:p-5", kind !== "upcoming" && "opacity-75")}>
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5 sm:w-[4.5rem]",
          kind === "upcoming" && "bg-forest-700 text-white",
          kind === "cancelled" && "bg-red-50 text-red-700",
          kind === "past" && "bg-zinc-100 text-zinc-500",
        )}
      >
        <span className="font-display text-2xl leading-none font-bold">{day}</span>
        <span className="mt-1 text-xs font-semibold uppercase">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {kind === "cancelled" && (
            <Pill tone="danger" icon={Ban} className="py-0.5 text-[11px]">
              Отменено
            </Pill>
          )}
          {kind === "past" && (
            <Pill tone="neutral" icon={History} className="py-0.5 text-[11px]">
              {e.status === "COMPLETED" ? "Завершено" : "Прошло"}
            </Pill>
          )}
          {e.isDemo && (
            <Pill tone="demo" className="py-0.5 text-[11px]">
              Демо
            </Pill>
          )}
        </div>
        <h3
          className={cn(
            "mt-1.5 font-display text-base leading-snug font-semibold text-zinc-900",
            kind === "cancelled" && "line-through decoration-red-300",
          )}
        >
          {e.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            {sameDay
              ? `${time(e.startsAt)} – ${time(e.endsAt)}`
              : `${time(e.startsAt)} · до ${e.endsAt.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: tz })}`}
          </span>
          {e.place && (
            <Link href={`/places/${e.place.slug}`} className="flex items-center gap-1.5 hover:text-zinc-800">
              <MapPin className="size-4" />
              {e.place.name}
              <span className="text-zinc-400">· {shortZoneName(e.place.zone.name)}</span>
            </Link>
          )}
          {e.organizer && (
            <span className="flex items-center gap-1.5">
              <User className="size-4" />
              {e.organizer}
            </span>
          )}
        </div>
        {e.description && <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-zinc-600">{e.description}</p>}
        {e.officialUrl && kind === "upcoming" && (
          <a
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:underline"
            href={e.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Официальная страница
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; from?: string; to?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const filtered = Boolean(sp.zone || sp.from || sp.to);

  const [events, zones] = await Promise.all([
    loadEvents(sp),
    prisma.zone.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  // Завершённые и прошедшие никогда не попадают в «предстоящие»
  const upcoming = events.filter((e) => e.status === "SCHEDULED" && e.endsAt >= now);
  const cancelled = events.filter((e) => e.status === "CANCELLED" && e.endsAt >= now);
  const past = events
    .filter((e) => e.status === "COMPLETED" || (e.status !== "CANCELLED" && e.endsAt < now))
    .reverse()
    .slice(0, 12);

  return (
    <Container size="md">
      <PageHeader title="События" subtitle="Фестивали, экскурсии и праздники рядом с местами карты" icon={CalendarDays} />

      <form action="/events" className="card mb-8 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="zone">
            Территория
          </label>
          <select id="zone" name="zone" className="input" defaultValue={sp.zone ?? ""}>
            <option value="">Вся Беларусь</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="label" htmlFor="from">
            С даты
          </label>
          <input id="from" name="from" type="date" className="input" defaultValue={sp.from ?? ""} />
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="label" htmlFor="to">
            По дату
          </label>
          <input id="to" name="to" type="date" className="input" defaultValue={sp.to ?? ""} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" type="submit">
            <Filter className="size-4" />
            Показать
          </button>
          {filtered && (
            <Link href="/events" className="btn btn-subtle" aria-label="Сбросить фильтры">
              <X className="size-4" />
            </Link>
          )}
        </div>
      </form>

      <section aria-labelledby="upcoming-h">
        <h2 id="upcoming-h" className="mb-3 font-display text-lg font-semibold">
          Предстоящие <span className="text-zinc-400">· {upcoming.length}</span>
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={filtered ? "Нет событий по фильтру" : "Предстоящих событий нет"}
            text={filtered ? "Попробуйте другой период или территорию." : "Загляните позже — редакторы добавляют новые события."}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} kind="upcoming" />
            ))}
          </ul>
        )}
      </section>

      {cancelled.length > 0 && (
        <section className="mt-10" aria-labelledby="cancelled-h">
          <h2 id="cancelled-h" className="mb-3 font-display text-lg font-semibold text-zinc-500">
            Отменённые
          </h2>
          <ul className="flex flex-col gap-3">
            {cancelled.map((e) => (
              <EventCard key={e.id} e={e} kind="cancelled" />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10" aria-labelledby="past-h">
          <h2 id="past-h" className="mb-3 font-display text-lg font-semibold text-zinc-500">
            Прошедшие
          </h2>
          <ul className="flex flex-col gap-3">
            {past.map((e) => (
              <EventCard key={e.id} e={e} kind="past" />
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

// Страница зависит от БД и текущего времени: рендерим блокирующе на сервере
export const instant = false;
