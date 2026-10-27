import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPlaceCard } from "@/lib/catalog";
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS } from "@/lib/place-meta";
import { RANK_ICONS, RANK_LABELS } from "@/lib/ranks";
import { CheckinButton } from "@/components/checkin-button";
import { ReviewForm } from "@/components/review-form";
import { prisma } from "@/lib/prisma";


function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm">{value ?? "Не уточнено"}</dd>
    </div>
  );
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const place = await getPlaceCard(slug, userId);
  if (!place) notFound();

  const myReview = userId
    ? await prisma.review.findUnique({
        where: { userId_placeId: { userId, placeId: place.id } },
      })
    : null;

  const routeHref = (base: string) =>
    `${base}?lat=${place.lat}&lon=${place.lon}&zpin=${place.lat},${place.lon}&name=${encodeURIComponent(place.name)}`;

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          Карта
        </Link>{" "}
        / <span>{place.name}</span>
      </nav>

      <header className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {PLACE_CATEGORY_ICONS[place.category]} {place.name}
          </h1>
          <span className="chip">{PLACE_CATEGORY_LABELS[place.category]}</span>
          {place.isDemo && (
            <span className="chip !border-amber-500 !text-amber-700">
              демо-данные
            </span>
          )}
          {place.visited && (
            <span className="chip !border-emerald-600 !text-emerald-700">
              ✔ посещено ({place.visitCount})
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm">{place.description}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Зона:{" "}
          <Link href={`/?zone=${place.zone.slug}`} className="underline">
            {RANK_ICONS[place.zone.status]} {place.zone.name} (
            {RANK_LABELS[place.zone.status]})
          </Link>
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <section className="card p-4">
            <h2 className="text-base font-semibold">Логистика и информация</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Адрес" value={place.address} />
              <Field label="Время работы" value={place.openingHours} />
              <Field label="Стоимость" value={place.priceInfo} />
              <Field label="Контакты" value={place.contacts} />
              <Field label="Доступность" value={place.accessibility} />
              <Field label="Советы по приезду" value={place.arrivalTips} />
              <Field
                label="Дата проверки данных"
                value={
                  place.verifiedAt
                    ? new Date(place.verifiedAt).toLocaleDateString("ru-RU")
                    : null
                }
              />
              <Field label="Координаты" value={`${place.lat}, ${place.lon}`} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="btn btn-ghost"
                href={routeHref("https://yandex.by/maps/")}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Маршрут (Яндекс)
              </a>
              <a
                className="btn btn-ghost"
                href={routeHref("https://www.google.com/maps/dir/?api=1&destination=") + `${place.lat},${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Маршрут (Google)
              </a>
              <a
                className="btn btn-ghost"
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=17/${place.lat}/${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                🗺️ OSM
              </a>
              {place.officialUrl && (
                <a
                  className="btn btn-ghost"
                  href={place.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  🔗 Официальный сайт
                </a>
              )}
            </div>
            {place.sourceUrl && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Источник координат:{" "}
                <a className="underline" href={place.sourceUrl} target="_blank" rel="noreferrer">
                  {place.sourceUrl}
                </a>
                {place.license ? ` · ${place.license}` : ""}
              </p>
            )}
          </section>

          <section className="card p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-base font-semibold">Отзывы</h2>
              <span className="chip">
                {place.ratingAvg
                  ? `★ ${place.ratingAvg.toFixed(1)} (${place.reviewsTotal})`
                  : "пока нет оценок"}
              </span>
              {place.zone.status === "NONE" && place.reviewsTotal > place.reviewsVisible && (
                <span className="chip !border-sky-500 !text-sky-700">
                  до открытия зоны показаны 3 из {place.reviewsTotal}
                </span>
              )}
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {place.reviews.map((r) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{r.author.displayName}</span>
                    {r.hasConfirmedVisit && (
                      <span
                        className="chip !border-emerald-600 !text-emerald-700"
                        title="Автор подтверждал визит"
                      >
                        ✔ визит подтверждён
                      </span>
                    )}
                    <span className="text-amber-600">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {r.text && <p className="mt-1 text-sm whitespace-pre-line">{r.text}</p>}
                  {r.tips && (
                    <p className="mt-1 rounded bg-sky-50 p-2 text-sm text-sky-900">
                      💡 {r.tips}
                    </p>
                  )}
                </li>
              ))}
              {place.reviews.length === 0 && (
                <li className="text-sm text-[var(--muted)]">Отзывов пока нет.</li>
              )}
            </ul>
            <h3 className="mt-5 text-sm font-semibold">
              {myReview ? "Ваш отзыв" : "Оставить отзыв"}
            </h3>
            <div className="mt-2">
              <ReviewForm
                placeId={place.id}
                authorized={!!userId}
                existing={
                  myReview
                    ? { rating: myReview.rating, text: myReview.text, tips: myReview.tips }
                    : null
                }
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <CheckinButton
            placeId={place.id}
            authorized={!!userId}
            demoEnabled={
              process.env.NODE_ENV !== "production" &&
              process.env.DEMO_GEO_ENABLED === "true"
            }
            visitedToday={place.visitCount > 0 && place.visited}
          />

          <section className="card p-4 text-sm">
            <h2 className="text-base font-semibold">Цель зоны</h2>
            <p className="mt-1">
              Бронза — первое место. Серебро — {place.zone.silverThreshold} мест.
              {place.zone.goldMinCount > 0
                ? ` Золото — ${place.zone.goldMinCount} мест + вся обязательная подборка.`
                : " Золото: задания готовятся."}
            </p>
            <p className="mt-1 text-[var(--muted)]">
              Ваш прогресс: {place.zone.uniquePlaces} уникальных мест.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href={`/diary/new?place=${place.id}`} className="btn btn-ghost">
                📖 Создать запись дневника
              </Link>
              <Link href={`/trips/new?place=${place.id}`} className="btn btn-ghost">
                🚩 Добавить в поездку
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
