import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  Accessibility,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  Check,
  Clock,
  ExternalLink,
  Lightbulb,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  Route,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { getPlaceCard } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { minskTodayKey } from "@/lib/dates";
import { CheckinButton } from "@/components/checkin-button";
import { ReviewForm } from "@/components/review-form";
import { CategoryIcon, CATEGORY_STYLE } from "@/components/ui/category";
import { RankBadge, RankLadder } from "@/components/ui/rank";
import { Avatar, ProgressBar, Stars } from "@/components/ui/primitives";
import { PLACE_CATEGORY_LABELS } from "@/lib/place-meta";
import { countLabel, formatDate, plural, shortZoneName } from "@/lib/format";
import { cn } from "@/lib/cn";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await prisma.place.findUnique({ where: { slug }, select: { name: true } });
  return { title: place?.name ?? "Место" };
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-50 text-zinc-500">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-zinc-500">{label}</dt>
        <dd className={cn("mt-0.5 text-sm", value ? "text-zinc-900" : "text-zinc-400 italic")}>
          {value ?? "Не уточнено"}
        </dd>
      </div>
    </div>
  );
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const place = await getPlaceCard(slug, userId);
  if (!place) notFound();

  const [myReview, visitedToday] = userId
    ? await Promise.all([
        prisma.review.findUnique({ where: { userId_placeId: { userId, placeId: place.id } } }),
        prisma.visit
          .count({ where: { userId, placeId: place.id, visitDay: minskTodayKey() } })
          .then((n) => n > 0),
      ])
    : [null, false];

  const demoEnabled =
    process.env.NODE_ENV !== "production" && process.env.DEMO_GEO_ENABLED === "true";
  const cat = CATEGORY_STYLE[place.category];
  const goldAvailable = place.zone.goldMinCount > 0;
  const hiddenReviews = place.reviewsTotal - place.reviewsVisible;

  return (
    <div className="pb-10">
      {/* Hero */}
      <section className={cn("relative overflow-hidden bg-gradient-to-br text-white", cat.gradient)}>
        <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden>
          <CategoryIcon category={place.category} className="absolute -right-10 -bottom-16 size-80" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-8 sm:px-6 lg:pt-8 lg:pb-12">
          <Link
            href={`/?zone=${place.zone.slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-semibold backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-4" />
            {shortZoneName(place.zone.name)}
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <CategoryIcon category={place.category} className="size-3.5" />
              {PLACE_CATEGORY_LABELS[place.category]}
            </span>
            {place.visited && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-bold text-emerald-950">
                <Check className="size-3.5" strokeWidth={3} />
                Посещено · {place.visitCount}
              </span>
            )}
            {place.isDemo && (
              <span className="rounded-full border border-dashed border-white/60 px-3 py-1 text-xs font-semibold">
                Демо-данные
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {place.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {place.zone.name}
            </span>
            {place.ratingAvg !== null && (
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-white">{place.ratingAvg.toFixed(1)}</span>
                <Stars value={place.ratingAvg} />
                <span>({place.reviewsTotal})</span>
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:gap-8 lg:pt-8">
        {/* Правая колонка (на мобильных — первой) */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <section className="card p-5">
            <h2 className="mb-4 font-display text-[15px] font-semibold">Подтвердить посещение</h2>
            <CheckinButton
              placeId={place.id}
              authorized={!!userId}
              demoEnabled={demoEnabled}
              visitedToday={visitedToday}
            />
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-semibold">Цель зоны</h2>
              <RankBadge rank={place.zone.status} size="sm" />
            </div>
            {userId && (
              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-semibold text-zinc-700">Ваш прогресс</span>
                  <span className="text-zinc-500">{place.zone.uniquePlaces} уник. мест</span>
                </div>
                <ProgressBar
                  value={place.zone.uniquePlaces}
                  max={goldAvailable ? place.zone.goldMinCount : place.zone.silverThreshold}
                  label="Прогресс зоны"
                />
              </div>
            )}
            <div className="mt-4">
              <RankLadder
                rank={place.zone.status}
                uniquePlaces={place.zone.uniquePlaces}
                silverThreshold={place.zone.silverThreshold}
                goldMinCount={place.zone.goldMinCount}
                goldAvailable={goldAvailable}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/diary/new?place=${place.id}`} className="btn btn-secondary btn-sm">
                <BookOpen className="size-4" />В дневник
              </Link>
              <Link href={`/trips/new?place=${place.id}`} className="btn btn-secondary btn-sm">
                <Route className="size-4" />В поездку
              </Link>
            </div>
          </section>
        </aside>

        {/* Основная колонка */}
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">О месте</h2>
            <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-zinc-700">
              {place.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                className="btn btn-primary btn-sm"
                href={`https://yandex.by/maps/?rtext=~${place.lat},${place.lon}&rtt=auto`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="size-4" />
                Маршрут в Яндекс Картах
              </a>
              <a
                className="btn btn-secondary btn-sm"
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                Google Maps
                <ExternalLink className="size-3.5" />
              </a>
              <a
                className="btn btn-secondary btn-sm"
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=17/${place.lat}/${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap
                <ExternalLink className="size-3.5" />
              </a>
              {place.officialUrl && (
                <a className="btn btn-secondary btn-sm" href={place.officialUrl} target="_blank" rel="noreferrer">
                  Официальный сайт
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Как добраться и что знать</h2>
              {userId && (
                <Link
                  href={`/suggest?place=${place.id}`}
                  className="btn btn-subtle btn-sm"
                  title="Предложить исправление данных"
                >
                  <Pencil className="size-3.5" />
                  <span className="hidden sm:inline">Исправить</span>
                </Link>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
              <InfoRow icon={MapPin} label="Адрес" value={place.address} />
              <InfoRow icon={Clock} label="Время работы" value={place.openingHours} />
              <InfoRow icon={Wallet} label="Стоимость" value={place.priceInfo} />
              <InfoRow icon={Phone} label="Контакты" value={place.contacts} />
              <InfoRow icon={Accessibility} label="Доступность" value={place.accessibility} />
              <InfoRow icon={Lightbulb} label="Советы по приезду" value={place.arrivalTips} />
              <InfoRow
                icon={CalendarCheck}
                label="Данные проверены"
                value={place.verifiedAt ? formatDate(place.verifiedAt) : null}
              />
              <InfoRow icon={Navigation} label="Координаты" value={`${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`} />
            </dl>
            {(place.sourceUrl || place.license) && (
              <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
                Источник:{" "}
                {place.sourceUrl ? (
                  <a className="underline hover:text-zinc-600" href={place.sourceUrl} target="_blank" rel="noreferrer">
                    {new URL(place.sourceUrl).hostname}
                  </a>
                ) : (
                  "—"
                )}
                {place.license ? ` · ${place.license}` : ""}
              </p>
            )}
          </section>

          <section className="card p-5 sm:p-6" id="reviews">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Отзывы</h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {place.reviewsTotal === 0
                    ? "Станьте первым, кто поделится впечатлениями"
                    : countLabel(place.reviewsTotal, "отзыв", "отзыва", "отзывов")}
                </p>
              </div>
              {place.ratingAvg !== null && (
                <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2">
                  <span className="font-display text-2xl font-bold text-amber-700">{place.ratingAvg.toFixed(1)}</span>
                  <Stars value={place.ratingAvg} />
                </div>
              )}
            </div>

            {place.reviews.length > 0 && (
              <ul className="mt-5 flex flex-col gap-3">
                {place.reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={r.author.displayName} seed={r.author.username} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-zinc-900">{r.author.displayName}</span>
                          {r.hasConfirmedVisit && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"
                              title="Автор подтверждал визит"
                            >
                              <BadgeCheck className="size-3.5" />
                              Был здесь
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Stars value={r.rating} className="[&_svg]:size-3.5" />
                          <span className="text-xs text-zinc-400">
                            {formatDate(r.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {r.text && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-zinc-700">{r.text}</p>}
                    {r.tips && (
                      <p className="mt-3 flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
                        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span>{r.tips}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {place.zone.status === "NONE" && hiddenReviews > 0 && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
                <Lock className="size-5 shrink-0 text-zinc-400" />
                <span>
                  Ещё {hiddenReviews} {plural(hiddenReviews, "отзыв", "отзыва", "отзывов")} откроется, когда вы
                  откроете зону «{shortZoneName(place.zone.name)}».
                </span>
              </div>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <MessageSquare className="size-4 text-forest-600" />
                {myReview ? "Ваш отзыв" : "Оставить отзыв"}
              </h3>
              <ReviewForm
                placeId={place.id}
                authorized={!!userId}
                existing={myReview ? { rating: myReview.rating, text: myReview.text, tips: myReview.tips } : null}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
