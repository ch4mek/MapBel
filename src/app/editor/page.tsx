import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlaceForm, ZoneForm, EventForm } from "@/components/editor-forms";
import { SuggestionActions, ReviewModerate, PlaceVisibility } from "@/components/editor-actions";
import { Avatar, Container, EmptyState, PageHeader, Pill, Section, Stars } from "@/components/ui/primitives";
import { CategoryTile } from "@/components/ui/category";
import { PLACE_CATEGORY_LABELS, type PlaceCategoryKey } from "@/lib/place-meta";
import { formatDate, formatDateTime, shortZoneName } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Редактор" };

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "suggestions", label: "Предложения", icon: Inbox },
  { key: "places", label: "Места", icon: MapPin },
  { key: "zones", label: "Зоны", icon: Shapes },
  { key: "events", label: "События", icon: CalendarDays },
  { key: "reviews", label: "Отзывы", icon: MessageSquare },
];

const PUBLICATION = {
  PUBLISHED: { label: "Опубликовано", tone: "success" },
  HIDDEN: { label: "Скрыто", tone: "danger" },
  DRAFT: { label: "Черновик", tone: "neutral" },
} as const;

const EVENT_STATUS = {
  SCHEDULED: { label: "Запланировано", tone: "info" },
  CANCELLED: { label: "Отменено", tone: "danger" },
  COMPLETED: { label: "Завершено", tone: "neutral" },
} as const;

const PAYLOAD_LABELS: Record<string, string> = {
  name: "Название",
  category: "Категория",
  description: "Описание",
  lat: "Широта",
  lon: "Долгота",
  zoneId: "Зона",
};

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EDITOR") {
    return (
      <Container size="sm">
        <EmptyState
          icon={Lock}
          title="Раздел для редакторов"
          text="Инструменты управления каталогом доступны только пользователям с ролью «редактор»."
          action={
            <Link href="/" className="btn btn-primary btn-sm">
              На карту
            </Link>
          }
        />
      </Container>
    );
  }

  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "suggestions";

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
    prisma.zone.findMany({
      select: {
        id: true,
        name: true,
        silverThreshold: true,
        goldMinCount: true,
        isDemo: true,
        _count: { select: { places: true, goldRequired: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.contentSuggestion.findMany({
      where: { status: "PENDING" },
      include: {
        author: { select: { displayName: true, username: true } },
        targetPlace: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.review.findMany({
      include: {
        user: { select: { displayName: true, username: true } },
        place: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.event.findMany({
      include: { place: { select: { name: true } } },
      orderBy: { startsAt: "desc" },
      take: 30,
    }),
  ]);

  const zoneNameById = new Map(zones.map((z) => [z.id, z.name]));
  const counts: Record<string, number> = {
    suggestions: suggestions.length,
    places: places.length,
    zones: zones.length,
    events: events.length,
    reviews: reviews.length,
  };

  return (
    <Container>
      <PageHeader
        title="Панель редактора"
        subtitle="Каталог мест, зоны, события и модерация. Ничего не публикуется автоматически."
        icon={ShieldCheck}
      />

      <nav
        className="no-scrollbar -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        aria-label="Разделы редактора"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/editor?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("chip h-10 shrink-0 px-4 text-sm", tab === t.key && "chip-active")}
          >
            <t.icon className="size-4" />
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px]",
                tab === t.key
                  ? "bg-white/20"
                  : t.key === "suggestions" && counts.suggestions > 0
                    ? "bg-rose-500 text-white"
                    : "bg-zinc-100 text-zinc-500",
              )}
            >
              {counts[t.key]}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "suggestions" &&
        (suggestions.length === 0 ? (
          <EmptyState icon={Inbox} title="Все предложения разобраны" text="Новые предложения пользователей появятся здесь." />
        ) : (
          <ul className="flex flex-col gap-4">
            {suggestions.map((s) => {
              const payload = s.payload as Record<string, unknown>;
              return (
                <li key={s.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={s.type === "NEW_PLACE" ? "info" : "warning"}>
                      {s.type === "NEW_PLACE" ? "Новое место" : "Исправление"}
                    </Pill>
                    {s.targetPlace && (
                      <Link href={`/places/${s.targetPlace.slug}`} className="text-sm font-semibold hover:underline">
                        → {s.targetPlace.name}
                      </Link>
                    )}
                    <span className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
                      <Avatar name={s.author.displayName} seed={s.author.username} className="size-6 text-[9px]" />
                      {s.author.displayName} · {formatDateTime(s.createdAt)}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-2xl bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                    {Object.entries(payload)
                      .filter(([, v]) => v !== undefined && v !== null && v !== "")
                      .map(([k, v]) => (
                        <div key={k} className={cn(k === "description" && "sm:col-span-2")}>
                          <dt className="text-xs font-medium text-zinc-500">{PAYLOAD_LABELS[k] ?? k}</dt>
                          <dd className="mt-0.5 whitespace-pre-line text-zinc-900">
                            {k === "category"
                              ? PLACE_CATEGORY_LABELS[v as PlaceCategoryKey] ?? String(v)
                              : k === "zoneId"
                                ? zoneNameById.get(String(v)) ?? String(v)
                                : String(v)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {s.note && (
                    <p className="mt-3 text-sm text-zinc-600">
                      <span className="font-semibold">Комментарий автора:</span> {s.note}
                    </p>
                  )}
                  {s.type === "NEW_PLACE" && (
                    <p className="hint mt-3">Одобренное место создаётся черновиком — опубликуйте его во вкладке «Места».</p>
                  )}
                  <SuggestionActions suggestionId={s.id} />
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "places" && (
        <div className="flex flex-col gap-6">
          <Section title="Создать или изменить место" icon={MapPin}>
            <PlaceForm
              zones={zones.map((z) => ({ id: z.id, name: z.name }))}
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
          </Section>
          <Section title={`Каталог · ${places.length}`} bodyClassName="p-0">
            <ul className="divide-y divide-zinc-100">
              {places.map((p) => {
                const pub = PUBLICATION[p.publicationStatus];
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <CategoryTile category={p.category} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/places/${p.slug}`} className="block truncate text-sm font-semibold hover:underline">
                        {p.name}
                      </Link>
                      <span className="block truncate text-xs text-zinc-500">{shortZoneName(p.zone.name)}</span>
                    </div>
                    <Pill tone={pub.tone} className="py-0.5 text-[11px]">
                      {pub.label}
                    </Pill>
                    <PlaceVisibility placeId={p.id} status={p.publicationStatus} />
                  </li>
                );
              })}
            </ul>
          </Section>
          <p className="text-xs text-zinc-400">
            Скрытие места не отнимает уже выданные пользователям награды и не понижает статус зон.
          </p>
        </div>
      )}

      {tab === "zones" && (
        <div className="flex flex-col gap-6">
          <Section title="Создать зону или изменить пороги" icon={Shapes}>
            <p className="mb-4 text-sm text-zinc-500">
              Новая зона задаётся прямоугольником границ. Пороги можно менять в любой момент — уже выданные статусы
              не понижаются.
            </p>
            <ZoneForm zones={zones.map((z) => ({ id: z.id, name: z.name }))} />
          </Section>
          <Section title={`Зоны · ${zones.length}`} bodyClassName="p-0">
            <ul className="divide-y divide-zinc-100">
              {zones.map((z) => (
                <li key={z.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{z.name}</span>
                  <span className="text-xs text-zinc-500">
                    {z._count.places} мест · серебро {z.silverThreshold} ·{" "}
                    {z.goldMinCount > 0 ? `золото ${z.goldMinCount} + ${z._count.goldRequired} обяз.` : "золото не задано"}
                  </span>
                  {z.isDemo && (
                    <Pill tone="demo" className="py-0.5 text-[11px]">
                      Демо
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {tab === "events" && (
        <div className="flex flex-col gap-6">
          <Section title="Новое событие" icon={CalendarDays}>
            <EventForm places={places.map((p) => ({ id: p.id, name: p.name }))} />
          </Section>
          <Section title={`События · ${events.length}`} bodyClassName="p-0">
            {events.length === 0 ? (
              <p className="p-5 text-sm text-zinc-500">Событий пока нет.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {events.map((e) => {
                  const st = EVENT_STATUS[e.status];
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.title}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {formatDate(e.startsAt)}
                          {e.place ? ` · ${e.place.name}` : ""}
                        </span>
                      </div>
                      <Pill tone={st.tone} className="py-0.5 text-[11px]">
                        {st.label}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      )}

      {tab === "reviews" &&
        (reviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Отзывов пока нет" />
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className={cn("card p-4", r.moderationStatus === "HIDDEN" && "border-dashed bg-zinc-50 opacity-70")}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={r.user.displayName} seed={r.user.username} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.user.displayName}
                      <span className="font-normal text-zinc-500"> о </span>
                      <Link href={`/places/${r.place.slug}`} className="hover:underline">
                        {r.place.name}
                      </Link>
                    </p>
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} className="[&_svg]:size-3.5" />
                      <span className="text-xs text-zinc-400">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  {r.moderationStatus === "HIDDEN" && (
                    <Pill tone="danger" className="py-0.5 text-[11px]">
                      Скрыт
                    </Pill>
                  )}
                  <ReviewModerate reviewId={r.id} hidden={r.moderationStatus === "HIDDEN"} />
                </div>
                {r.text && <p className="mt-3 line-clamp-4 text-sm text-zinc-700">{r.text}</p>}
              </li>
            ))}
          </ul>
        ))}
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
