import Link from "next/link";
import { prisma } from "@/lib/prisma";


export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const events = await prisma.event.findMany({
    where: {
      ...(sp.zone || sp.from || sp.to
        ? {
            place: sp.zone ? { zoneId: sp.zone } : undefined,
            startsAt: {
              ...(sp.from ? { gte: new Date(sp.from) } : {}),
              ...(sp.to ? { lte: new Date(sp.to + "T23:59:59") } : {}),
            },
          }
        : {}),
    },
    include: {
      place: {
        select: { name: true, slug: true, zone: { select: { name: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const now = new Date();
  const upcoming = events.filter(
    (e) => e.status === "SCHEDULED" && e.endsAt >= now,
  );
  const cancelled = events.filter((e) => e.status === "CANCELLED" && e.endsAt >= now);
  const past = events
    .filter((e) => e.status === "COMPLETED" || e.endsAt < now)
    .reverse()
    .slice(0, 12);

  const zones = await prisma.zone.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  function EventCard({ e, pastView = false }: { e: (typeof events)[number]; pastView?: boolean }) {
    return (
      <li className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{e.title}</h3>
          {e.status === "CANCELLED" && (
            <span className="chip !border-red-400 !text-red-600">ОТМЕНЕНО</span>
          )}
          {e.status === "COMPLETED" && (
            <span className="chip !border-amber-500 !text-amber-700">завершено</span>
          )}
          {e.isDemo && (
            <span className="chip !border-amber-400 !text-amber-700">демо</span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {e.startsAt.toLocaleString("ru-RU", {
            timeZone: e.timezone,
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" – "}
          {e.endsAt.toLocaleString("ru-RU", {
            timeZone: e.timezone,
            timeStyle: "short",
          })}
          {pastView ? " (прошло)" : ""}
        </p>
        {e.description && <p className="mt-1 text-sm">{e.description}</p>}
        <p className="mt-1 text-sm">
          {e.place ? (
            <>
              Место:{" "}
              <Link href={`/places/${e.place.slug}`} className="underline">
                {e.place.name}
              </Link>{" "}
              ({e.place.zone.name})
            </>
          ) : (
            e.organizer && `Организатор: ${e.organizer}`
          )}
        </p>
        {e.officialUrl && (
          <a
            className="mt-1 inline-block text-sm text-[var(--brand)] underline"
            href={e.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Официальная страница
          </a>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">События</h1>

      <form className="card flex flex-wrap items-end gap-2 p-3" action="/events">
        <div>
          <label className="label" htmlFor="zone">
            Территория
          </label>
          <select id="zone" name="zone" className="input" defaultValue={sp.zone ?? ""}>
            <option value="">Все зоны</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">
            С даты
          </label>
          <input id="from" name="from" type="date" className="input" defaultValue={sp.from ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="to">
            По дату
          </label>
          <input id="to" name="to" type="date" className="input" defaultValue={sp.to ?? ""} />
        </div>
        <button className="btn btn-ghost" type="submit">
          Фильтровать
        </button>
        <Link href="/events" className="btn btn-ghost">
          Сбросить
        </Link>
      </form>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Предстоящие ({upcoming.length})</h2>
        <ul className="flex flex-col gap-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
          {upcoming.length === 0 && (
            <li className="card p-4 text-sm text-[var(--muted)]">
              Предстоящих событий нет.
            </li>
          )}
        </ul>
      </section>

      {cancelled.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Отменённые</h2>
          <ul className="flex flex-col gap-3 opacity-75">
            {cancelled.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Прошедшие</h2>
          <ul className="flex flex-col gap-3 opacity-75">
            {past.map((e) => (
              <EventCard key={e.id} e={e} pastView />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
