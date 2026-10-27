import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PHOTO_LIMITS } from "@/config/game";
import { TagActions } from "@/components/tag-actions";


const VISIBILITY_RU: Record<string, string> = {
  PRIVATE: "только мне",
  FRIENDS: "друзьям",
  PUBLIC: "всем",
};

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;
  const sp = await searchParams;

  const entries = await prisma.diaryEntry.findMany({
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
      place: { select: { name: true, slug: true } },
      photos: { select: { previewKey: true }, take: 3 },
      _count: { select: { photos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Входящие отметки на фото, ждущие согласия
  const pendingTags = await prisma.photoTag.findMany({
    where: { taggedUserId: userId, status: "PENDING" },
    include: {
      photo: {
        select: {
          id: true,
          previewKey: true,
          entry: { select: { id: true, title: true, author: { select: { displayName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Дневник</h1>
        <Link href="/diary/new" className="btn btn-primary">
          ➕ Новая запись
        </Link>
      </div>

      {pendingTags.length > 0 && (
        <section className="card border-sky-300 p-4">
          <h2 className="text-base font-semibold">
            Вас отметили на фотографиях ({pendingTags.length})
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {pendingTags.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${t.photo.previewKey}`}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                />
                <span>
                  {t.photo.entry.author.displayName} отметил вас в записи «
                  {t.photo.entry.title}»
                </span>
                <TagActions tagId={t.id} kind="respond" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Пока вы не согласитесь, отметка не показывается другим как
            подтверждённая.
          </p>
        </section>
      )}

      <form className="card flex flex-wrap items-end gap-2 p-3" action="/diary">
        <div>
          <label className="label" htmlFor="f-from">
            Дата поездки с
          </label>
          <input id="f-from" name="from" type="date" className="input" defaultValue={sp.from ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="f-to">
            по
          </label>
          <input id="f-to" name="to" type="date" className="input" defaultValue={sp.to ?? ""} />
        </div>
        <button className="btn btn-ghost" type="submit">
          Фильтр по дате
        </button>
        <Link href="/diary" className="btn btn-ghost">
          Сбросить
        </Link>
      </form>

      {entries.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--muted)]">
          Записей пока нет.{" "}
          <Link href="/diary/new" className="text-[var(--brand)] underline">
            Создайте первую
          </Link>{" "}
          — например, после подтверждения посещения.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/diary/${e.id}`}
                className="card flex h-full flex-col overflow-hidden hover:shadow-sm"
              >
                <div className="flex h-32 gap-0.5 overflow-hidden bg-gray-100">
                  {e.photos.length > 0 ? (
                    e.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.previewKey}
                        src={`/api/files/${p.previewKey}`}
                        alt=""
                        className="h-full w-1/2 object-cover"
                      />
                    ))
                  ) : (
                    <div className="flex w-full items-center justify-center text-3xl" aria-hidden>
                      📖
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="font-semibold leading-tight">{e.title}</span>
                  <span className="text-sm text-[var(--muted)]">{e.place.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {e.tripDate ? `${e.tripDate.toLocaleDateString("ru-RU")} · ` : ""}
                    {e._count.photos} фото · видна: {VISIBILITY_RU[e.visibility]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--muted)]">
        Ограничения альбома: до {PHOTO_LIMITS.maxPerEntry} фото на запись, файлы
        JPEG/PNG/WebP до 10 МБ. Создание записи не начисляет очки и не создаёт
        визит.
      </p>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
