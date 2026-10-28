import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, EyeOff, Globe, MapPin, Route, Settings2, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptedFriendIds, canReadDiaryEntry } from "@/lib/acl";
import { PHOTO_LIMITS } from "@/config/game";
import { EntryEditor } from "@/components/entry-editor";
import { PhotoManager, type PhotoItem } from "@/components/photo-manager";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { CategoryBadge } from "@/components/ui/category";
import { Avatar, Container } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Запись дневника" };

const VISIBILITY = {
  PRIVATE: { label: "Только мне", icon: EyeOff },
  FRIENDS: { label: "Друзьям", icon: Users },
  PUBLIC: { label: "Всем", icon: Globe },
} as const;

export default async function DiaryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  // Доступ проверяется на сервере до загрузки содержимого
  const readable = await canReadDiaryEntry(id, viewerId);
  if (!readable) notFound();

  const entry = await prisma.diaryEntry.findUnique({
    where: { id },
    include: {
      place: { select: { id: true, name: true, slug: true, category: true } },
      trip: { select: { id: true, title: true } },
      photos: {
        orderBy: { sort: "asc" },
        include: { tags: { include: { taggedUser: { select: { displayName: true, username: true } } } } },
      },
      author: { select: { displayName: true, username: true } },
    },
  });
  if (!entry) notFound();

  const isAuthor = entry.authorId === viewerId;
  const [places, friends] = isAuthor
    ? await Promise.all([
        prisma.place.findMany({
          where: { publicationStatus: "PUBLISHED" },
          select: { id: true, name: true, zone: { select: { name: true } } },
          orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
        }),
        acceptedFriendIds(entry.authorId).then((ids) =>
          prisma.user.findMany({
            where: { id: { in: ids } },
            select: { username: true, displayName: true },
            orderBy: { displayName: "asc" },
          }),
        ),
      ])
    : [[], []];

  // Посторонним показываем только принятые отметки
  const photos: PhotoItem[] = entry.photos.map((p) => ({
    id: p.id,
    previewKey: p.previewKey,
    storageKey: p.storageKey,
    caption: p.caption,
    width: p.width,
    height: p.height,
    tags: p.tags
      .filter((t) => isAuthor || t.status === "ACCEPTED")
      .map((t) => ({ id: t.id, status: t.status, taggedUser: t.taggedUser })),
  }));

  const vis = VISIBILITY[entry.visibility];

  return (
    <Container size="md">
      <Link href={isAuthor ? "/diary" : `/users/${entry.author.username}`} className="btn btn-subtle btn-sm -ml-3 mb-4">
        <ArrowLeft className="size-4" />
        {isAuthor ? "Дневник" : entry.author.displayName}
      </Link>

      <article className="flex flex-col gap-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={entry.place.category} size="sm" />
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
              <vis.icon className="size-3" />
              {vis.label}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {entry.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
            <Link href={`/users/${entry.author.username}`} className="flex items-center gap-2 font-semibold text-zinc-800 hover:underline">
              <Avatar name={entry.author.displayName} seed={entry.author.username} className="size-7 text-[10px]" />
              {entry.author.displayName}
            </Link>
            <Link href={`/places/${entry.place.slug}`} className="flex items-center gap-1.5 hover:text-zinc-800">
              <MapPin className="size-4" />
              {entry.place.name}
            </Link>
            {entry.tripDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatDate(entry.tripDate)}
              </span>
            )}
            {entry.trip && (
              <Link href={`/trips/${entry.trip.id}`} className="flex items-center gap-1.5 hover:text-zinc-800">
                <Route className="size-4" />
                {entry.trip.title}
              </Link>
            )}
          </div>
        </header>

        {entry.description && (
          <p className="text-[16px] leading-relaxed whitespace-pre-line text-zinc-700">{entry.description}</p>
        )}

        <PhotoManager
          entryId={entry.id}
          photos={photos}
          maxPhotos={PHOTO_LIMITS.maxPerEntry}
          isAuthor={isAuthor}
          friends={friends}
        />

        {isAuthor && (
          <details className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-display text-[15px] font-semibold select-none hover:bg-zinc-50">
              <Settings2 className="size-[18px] text-forest-600" />
              Редактировать запись
              <span className="ml-auto text-xs font-normal text-zinc-400 group-open:hidden">развернуть</span>
            </summary>
            <div className="border-t border-zinc-100 p-5">
              <EntryEditor
                mode="edit"
                entry={{
                  id: entry.id,
                  title: entry.title,
                  placeId: entry.placeId,
                  tripDate: entry.tripDate ? entry.tripDate.toISOString().slice(0, 10) : null,
                  description: entry.description,
                  visibility: entry.visibility,
                }}
                places={places.map((p) => ({ id: p.id, name: p.name, zoneName: p.zone.name }))}
                trips={[]}
              />
              <div className="mt-6 border-t border-zinc-100 pt-5">
                <DeleteEntryButton entryId={entry.id} />
              </div>
            </div>
          </details>
        )}
      </article>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
