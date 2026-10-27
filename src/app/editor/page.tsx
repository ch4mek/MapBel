import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlaceForm, ZoneForm, EventForm } from "@/components/editor-forms";
import {
  SuggestionActions,
  ReviewModerate,
  PlaceVisibility,
} from "@/components/editor-actions";


export default async function EditorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EDITOR") {
    return (
      <div className="card mx-auto mt-8 max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">Редакторские инструменты</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Раздел доступен только пользователям с ролью «редактор».
        </p>
      </div>
    );
  }

  const [places, zones, suggestions, reviews, events] = await Promise.all([
    prisma.place.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        zoneId: true,
        category: true,
        description: true,
        lat: true,
        lon: true,
        radiusM: true,
        address: true,
        openingHours: true,
        priceInfo: true,
        contacts: true,
        officialUrl: true,
        accessibility: true,
        arrivalTips: true,
        isDemo: true,
        publicationStatus: true,
        zone: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.zone.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contentSuggestion.findMany({
      where: { status: "PENDING" },
      include: {
        author: { select: { displayName: true, username: true } },
        targetPlace: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.review.findMany({
      where: { moderationStatus: "ACTIVE" },
      include: {
        user: { select: { displayName: true } },
        place: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.event.findMany({
      include: { place: { select: { name: true } } },
      orderBy: { startsAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Инструменты редактора</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Минимальные защищённые формы: места, зоны, события, предложения и
          модерация отзывов. Ничего не публикуется автоматически.
        </p>
      </header>

      <section className="card p-4">
        <h2 className="text-base font-semibold">
          Предложения пользователей ({suggestions.length})
        </h2>
        <ul className="mt-2 flex flex-col gap-3">
          {suggestions.map((s) => (
            <li key={s.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  {s.type === "NEW_PLACE" ? "Новое место" : "Исправление"}
                </span>
                <span>
                  от {s.author.displayName} (@{s.author.username})
                </span>
                {s.targetPlace && <span>→ {s.targetPlace.name}</span>}
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(s.payload, null, 1)}
              </pre>
              {s.note && <p className="mt-1 text-xs">Комментарий: {s.note}</p>}
              <SuggestionActions suggestionId={s.id} />
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="text-sm text-[var(--muted)]">Неразобранных предложений нет.</li>
          )}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="text-base font-semibold">Места ({places.length})</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {places.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
              <Link href={`/places/${p.slug}`} className="underline">
                {p.name}
              </Link>
              <span className="text-xs text-[var(--muted)]">{p.zone.name}</span>
              <span
                className={`chip ${
                  p.publicationStatus === "PUBLISHED"
                    ? "!border-emerald-600 !text-emerald-700"
                    : p.publicationStatus === "HIDDEN"
                      ? "!border-red-400 !text-red-600"
                      : ""
                }`}
              >
                {p.publicationStatus === "PUBLISHED"
                  ? "опубликовано"
                  : p.publicationStatus === "HIDDEN"
                    ? "скрыто"
                    : "черновик"}
              </span>
              <PlaceVisibility placeId={p.id} status={p.publicationStatus} />
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Форма места (создать / изменить)
          </summary>
          <div className="mt-3">
            <PlaceForm
              zones={zones}
              places={places.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                zoneId: p.zoneId,
                category: p.category,
                description: p.description,
                lat: p.lat.toNumber(),
                lon: p.lon.toNumber(),
                radiusM: p.radiusM,
                address: p.address,
                openingHours: p.openingHours,
                priceInfo: p.priceInfo,
                contacts: p.contacts,
                officialUrl: p.officialUrl,
                accessibility: p.accessibility,
                arrivalTips: p.arrivalTips,
                isDemo: p.isDemo,
              }))}
            />
          </div>
        </details>
      </section>

      <section className="card p-4">
        <h2 className="text-base font-semibold">Зоны ({zones.length})</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Новая зона создаётся прямоугольником по границам. Пороги рангов можно
          менять в любой момент — статус уже открытых зон не понижается.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Форма зоны (создать / изменить пороги)
          </summary>
          <div className="mt-3">
            <ZoneForm zones={zones} />
          </div>
        </details>
      </section>

      <section className="card p-4">
        <h2 className="text-base font-semibold">События</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2">
              <span>{e.title}</span>
              <span className="text-xs text-[var(--muted)]">
                {e.startsAt.toLocaleDateString("ru-RU")} ·{" "}
                {e.status === "SCHEDULED"
                  ? "запланировано"
                  : e.status === "CANCELLED"
                    ? "отменено"
                    : "завершено"}
              </span>
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Форма события
          </summary>
          <div className="mt-3">
            <EventForm places={places.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        </details>
      </section>

      <section className="card p-4">
        <h2 className="text-base font-semibold">Модерация отзывов</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
              <Link href={`/places/${r.place.slug}`} className="underline">
                {r.place.name}
              </Link>
              <span className="text-amber-600">{"★".repeat(r.rating)}</span>
              <span className="text-xs text-[var(--muted)]">{r.user.displayName}</span>
              <ReviewModerate reviewId={r.id} hidden={false} />
            </li>
          ))}
          {reviews.length === 0 && (
            <li className="text-[var(--muted)]">Активных отзывов нет.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
