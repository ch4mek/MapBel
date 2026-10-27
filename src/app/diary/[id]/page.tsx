import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadDiaryEntry } from "@/lib/acl";
import { PHOTO_LIMITS } from "@/config/game";
import { EntryEditor } from "@/components/entry-editor";
import { PhotoManager, type PhotoItem } from "@/components/photo-manager";
import { DeleteEntryButton } from "@/components/delete-entry-button";


export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const readable = await canReadDiaryEntry(id, viewerId);
  if (!readable) notFound();

  const entry = await prisma.diaryEntry.findUnique({
    where: { id },
    include: {
      place: { select: { id: true, name: true, slug: true } },
      trip: { select: { id: true, title: true } },
      visit: { select: { id: true, visitedAt: true } },
      photos: {
        orderBy: { sort: "asc" },
        include: {
          tags: {
            include: { taggedUser: { select: { displayName: true, username: true } } },
          },
        },
      },
      author: { select: { displayName: true, username: true } },
    },
  });
  if (!entry) notFound();

  const isAuthor = entry.authorId === viewerId;
  const places = isAuthor
    ? await prisma.place.findMany({
        where: { publicationStatus: "PUBLISHED" },
        select: { id: true, name: true, zone: { select: { name: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  const photos: PhotoItem[] = entry.photos.map((p) => ({
    id: p.id,
    previewKey: p.previewKey,
    storageKey: p.storageKey,
    caption: p.caption,
    width: p.width,
    height: p.height,
    tags: p.tags.map((t) => ({
      id: t.id,
      status: t.status,
      taggedUser: t.taggedUser,
    })),
  }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <nav className="text-sm text-[var(--muted)]">
        <Link href="/diary" className="hover:underline">
          Дневник
        </Link>{" "}
        / <span>{entry.title}</span>
      </nav>

      <header className="card p-4">
        <h1 className="text-2xl font-bold">{entry.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Автор: {entry.author.displayName} (@{entry.author.username}) · место:{" "}
          <Link href={`/places/${entry.place.slug}`} className="underline">
            {entry.place.name}
          </Link>
          {entry.trip && (
            <>
              {" "}
              · поездка:{" "}
              <Link href={`/trips/${entry.trip.id}`} className="underline">
                {entry.trip.title}
              </Link>
            </>
          )}
          {entry.tripDate && ` · дата поездки: ${entry.tripDate.toLocaleDateString("ru-RU")}`}
        </p>
        {entry.description && (
          <p className="mt-3 text-sm whitespace-pre-line">{entry.description}</p>
        )}
      </header>

      <PhotoManager
        entryId={entry.id}
        photos={photos}
        maxPhotos={PHOTO_LIMITS.maxPerEntry}
        isAuthor={isAuthor}
      />

      {isAuthor && (
        <>
          <section className="card p-4">
            <h2 className="text-base font-semibold">Редактирование записи</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Удаление записи не удаляет подтверждённые визиты и не откатывает
              прогресс.
            </p>
            <div className="mt-3">
              <EntryEditor
                mode="edit"
                entry={{
                  id: entry.id,
                  title: entry.title,
                  placeId: entry.placeId,
                  tripDate: entry.tripDate
                    ? entry.tripDate.toISOString().slice(0, 10)
                    : null,
                  description: entry.description,
                  visibility: entry.visibility,
                }}
                places={places.map((p) => ({
                  id: p.id,
                  name: p.name,
                  zoneName: p.zone.name,
                }))}
                trips={[]}
              />
            </div>
          </section>
          <DeleteEntryButton entryId={entry.id} />
        </>
      )}
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
