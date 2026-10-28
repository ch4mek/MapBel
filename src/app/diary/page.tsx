import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Camera, Eye, EyeOff, Filter, Globe, Plus, Tag, Users, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PHOTO_LIMITS } from "@/config/game";
import { TagActions } from "@/components/tag-actions";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CategoryTile } from "@/components/ui/category";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Дневник" };

const VISIBILITY = {
  PRIVATE: { label: "Только мне", icon: EyeOff },
  FRIENDS: { label: "Друзьям", icon: Users },
  PUBLIC: { label: "Всем", icon: Globe },
} as const;

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;
  const sp = await searchParams;
  const filtered = Boolean(sp.place || sp.from || sp.to);

  const [entries, pendingTags, myPlaces] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: {
        authorId: userId,
        ...(sp.place ? { placeId: sp.place } : {}),
        ...(sp.from || sp.to
          ? {
              tripDate: {
                ...(sp.from ? { gte: new Date(sp.from) } : {}),
                ...(sp.to ? { lte: new Date(sp.to + "T23:59:59") } : {}),
              },
            }
          : {}),
      },
      include: {
        place: { select: { name: true, slug: true, category: true } },
        photos: { select: { previewKey: true }, orderBy: { sort: "asc" }, take: 1 },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.photoTag.findMany({
      where: { taggedUserId: userId, status: "PENDING" },
      include: {
        photo: {
          select: {
            previewKey: true,
            entry: { select: { id: true, title: true, author: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.place.findMany({
      where: { diaryEntries: { some: { authorId: userId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <Container>
      <PageHeader
        title="Дневник"
        subtitle="Впечатления, фотографии и отметки друзей"
        icon={BookOpen}
        actions={
          <Link href="/diary/new" className="btn btn-primary">
            <Plus className="size-4" />
            Новая запись
          </Link>
        }
      />

      {pendingTags.length > 0 && (
        <section className="card mb-6 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-sky-900">
            <Tag className="size-[18px]" />
            Вас отметили на фото · {pendingTags.length}
          </h2>
          <p className="mt-1 text-xs text-sky-800/70">
            Пока вы не согласитесь, отметка не видна другим как подтверждённая.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {pendingTags.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${t.photo.previewKey}`}
                  alt=""
                  className="size-14 rounded-xl object-cover"
                />
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{t.photo.entry.author.displayName}</span>
                  <span className="text-zinc-500"> отметил(а) вас в «{t.photo.entry.title}»</span>
                </p>
                <TagActions tagId={t.id} kind="respond" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action="/diary" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="f-place">
            Место
          </label>
          <select id="f-place" name="place" className="input" defaultValue={sp.place ?? ""}>
            <option value="">Все места</option>
            {myPlaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="label" htmlFor="f-from">
            С даты
          </label>
          <input id="f-from" name="from" type="date" className="input" defaultValue={sp.from ?? ""} />
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="label" htmlFor="f-to">
            По дату
          </label>
          <input id="f-to" name="to" type="date" className="input" defaultValue={sp.to ?? ""} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" type="submit">
            <Filter className="size-4" />
            Показать
          </button>
          {filtered && (
            <Link href="/diary" className="btn btn-subtle" aria-label="Сбросить фильтры">
              <X className="size-4" />
            </Link>
          )}
        </div>
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon={filtered ? Filter : BookOpen}
          title={filtered ? "Нет записей по фильтру" : "Дневник пока пуст"}
          text={
            filtered
              ? "Попробуйте изменить место или период."
              : "Подтвердите посещение места и запишите впечатления — с фотографиями и отметками друзей."
          }
          action={
            filtered ? (
              <Link href="/diary" className="btn btn-secondary btn-sm">Сбросить фильтры</Link>
            ) : (
              <Link href="/diary/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                Первая запись
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => {
            const vis = VISIBILITY[e.visibility];
            const cover = e.photos[0]?.previewKey;
            return (
              <li key={e.id}>
                <Link
                  href={`/diary/${e.id}`}
                  className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${cover}`}
                        alt=""
                        className="size-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <CategoryTile category={e.place.category} className="size-16 rounded-2xl" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 backdrop-blur">
                      <vis.icon className="size-3" />
                      {vis.label}
                    </span>
                    {e._count.photos > 0 && (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        <Camera className="size-3" />
                        {e._count.photos}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="line-clamp-2 font-display text-[15px] leading-snug font-semibold text-zinc-900">
                      {e.title}
                    </h2>
                    <p className="mt-1 truncate text-sm text-zinc-500">{e.place.name}</p>
                    <p className="mt-auto pt-3 text-xs text-zinc-400">
                      {e.tripDate ? formatDate(e.tripDate) : `Создано ${formatDate(e.createdAt)}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs text-zinc-400">
        <Eye className="mt-0.5 size-3.5 shrink-0" />
        До {PHOTO_LIMITS.maxPerEntry} фото на запись, JPEG/PNG/WebP до 10 МБ. Записи не начисляют очки и не
        открывают зоны — для этого нужно подтвердить посещение на месте.
      </p>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
