// Права доступа: видимость дневника и граф дружбы (разделы 8–9, 14 ТЗ).
// Проверка доступа к приватным записям и файлам выполняется на сервере.

import { prisma } from "@/lib/prisma";

export async function acceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return row !== null;
}

export type DiaryVisibility = "PRIVATE" | "FRIENDS" | "PUBLIC";

/** Может ли viewer читать запись дневника с данной видимостью. */
export function canViewDiaryEntry(
  entry: { authorId: string; visibility: DiaryVisibility },
  viewerId: string | null,
): boolean {
  if (entry.authorId === viewerId) return true;
  if (entry.visibility === "PUBLIC") return true;
  if (entry.visibility === "PRIVATE") return false;
  // FRIENDS: нужен зритель и дружба — проверяется отдельным запросом.
  return viewerId !== null;
}

export async function canReadDiaryEntry(
  entryId: string,
  viewerId: string | null,
): Promise<{ entry: { id: string; authorId: string; visibility: DiaryVisibility } } | null> {
  const entry = await prisma.diaryEntry.findUnique({
    where: { id: entryId },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!entry) return null;
  if (!canViewDiaryEntry(entry, viewerId)) return null;
  if (entry.visibility === "FRIENDS" && viewerId && entry.authorId !== viewerId) {
    if (!(await areFriends(viewerId, entry.authorId))) return null;
  }
  return { entry };
}

/** ACL файла дневника: ключ → запись → видимость. */
export async function canReadPhotoKey(
  key: string,
  viewerId: string | null,
): Promise<boolean> {
  const photo = await prisma.diaryPhoto.findFirst({
    where: { OR: [{ storageKey: key }, { previewKey: key }] },
    select: {
      storageKey: true,
      entry: { select: { authorId: true, visibility: true } },
    },
  });
  if (!photo) return false;
  if (!canViewDiaryEntry(photo.entry, viewerId)) return false;
  if (photo.entry.visibility === "FRIENDS" && viewerId && photo.entry.authorId !== viewerId) {
    return areFriends(viewerId, photo.entry.authorId);
  }
  return true;
}
