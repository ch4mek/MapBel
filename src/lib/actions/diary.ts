"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { acceptedFriendIds, canReadDiaryEntry } from "@/lib/acl";
import { PHOTO_LIMITS } from "@/config/game";

const visibilityEnum = z.enum(["PRIVATE", "FRIENDS", "PUBLIC"]);

const entrySchema = z.object({
  title: z.string().trim().min(1, "Введите заголовок").max(120),
  placeId: z.string().min(1),
  tripDate: z.string().optional(), // YYYY-MM-DD
  description: z.string().trim().max(10000).optional(),
  visibility: visibilityEnum.default("FRIENDS"),
  tripId: z.string().optional(),
});

export interface ActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

/** Создание записи. Запись сама по себе не создаёт визит и не даёт очков. */
export async function createDiaryEntryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = entrySchema.safeParse({
    title: formData.get("title"),
    placeId: formData.get("placeId"),
    tripDate: formData.get("tripDate") || undefined,
    description: formData.get("description") || undefined,
    visibility: formData.get("visibility") || "FRIENDS",
    tripId: formData.get("tripId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const place = await prisma.place.findUnique({
    where: { id: parsed.data.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Место не найдено" };

  const entry = await prisma.diaryEntry.create({
    data: {
      authorId: user.id,
      placeId: place.id,
      title: parsed.data.title,
      tripDate: parsed.data.tripDate ? new Date(parsed.data.tripDate) : null,
      description: parsed.data.description || null,
      visibility: parsed.data.visibility,
      tripId: parsed.data.tripId || null,
    },
  });
  revalidatePath("/diary");
  return { ok: true, id: entry.id };
}

export async function updateDiaryEntryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = entrySchema.safeParse({
    title: formData.get("title"),
    placeId: formData.get("placeId"),
    tripDate: formData.get("tripDate") || undefined,
    description: formData.get("description") || undefined,
    visibility: formData.get("visibility") || "FRIENDS",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const entry = await prisma.diaryEntry.findUnique({ where: { id } });
  if (!entry || entry.authorId !== user.id) {
    return { error: "Можно редактировать только свои записи" };
  }
  await prisma.diaryEntry.update({
    where: { id },
    data: {
      title: parsed.data.title,
      placeId: parsed.data.placeId,
      tripDate: parsed.data.tripDate ? new Date(parsed.data.tripDate) : null,
      description: parsed.data.description || null,
      visibility: parsed.data.visibility,
    },
  });
  revalidatePath(`/diary/${id}`);
  return { ok: true, id };
}

/** Удаление записи не удаляет подтверждённые визиты (раздел 13 ТЗ). */
export async function deleteDiaryEntryAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await prisma.diaryEntry.findUnique({ where: { id } });
  if (!entry || entry.authorId !== user.id) {
    return { error: "Можно удалять только свои записи" };
  }
  await prisma.diaryEntry.delete({ where: { id } });
  revalidatePath("/diary");
  return { ok: true };
}

/** Отметить друга на фото: только автор записи и только из числа друзей. */
export async function createPhotoTagAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const photoId = String(formData.get("photoId") ?? "");
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  if (!photoId || !username) return { error: "Укажите имя пользователя друга" };

  const photo = await prisma.diaryPhoto.findUnique({
    where: { id: photoId },
    include: { entry: { select: { authorId: true } } },
  });
  if (!photo || photo.entry.authorId !== user.id) {
    return { error: "Отмечать можно только на своих фотографиях" };
  }
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return { error: "Пользователь не найден" };
  if (target.id === user.id) return { error: "Нельзя отметить себя" };
  const friends = await acceptedFriendIds(user.id);
  if (!friends.includes(target.id)) {
    return { error: "Отмечать можно только друзей" };
  }
  await prisma.photoTag.upsert({
    where: { photoId_taggedUserId: { photoId, taggedUserId: target.id } },
    create: { photoId, taggedUserId: target.id },
    update: { status: "PENDING", respondedAt: null },
  });
  revalidatePath(`/diary/${photo.entryId}`);
  return { ok: true };
}

/** Согласие отмеченного: пока не принято — отметка не «подтверждённая». */
export async function respondPhotoTagAction(
  tagId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const tag = await prisma.photoTag.findUnique({ where: { id: tagId } });
  if (!tag || tag.taggedUserId !== user.id) {
    return { error: "Только отмеченный пользователь может ответить" };
  }
  if (tag.status !== "PENDING") return { error: "На отметку уже ответили" };
  await prisma.photoTag.update({
    where: { id: tagId },
    data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
  });
  revalidatePath("/diary");
  return { ok: true };
}

export async function removePhotoTagAction(tagId: string): Promise<ActionResult> {
  const user = await requireUser();
  const tag = await prisma.photoTag.findUnique({
    where: { id: tagId },
    include: { photo: { include: { entry: { select: { authorId: true } } } } },
  });
  if (!tag) return { error: "Отметка не найдена" };
  const canRemove =
    tag.photo.entry.authorId === user.id || tag.taggedUserId === user.id;
  if (!canRemove) return { error: "Недостаточно прав" };
  await prisma.photoTag.delete({ where: { id: tagId } });
  revalidatePath(`/diary/${tag.photo.entryId}`);
  return { ok: true };
}

export async function remainingPhotoSlots(entryId: string): Promise<number> {
  const count = await prisma.diaryPhoto.count({ where: { entryId } });
  return Math.max(0, PHOTO_LIMITS.maxPerEntry - count);
}

/** Доступные для привязки поездки пользователя (для формы записи). */
export async function listMyTripsForEntry() {
  const user = await requireUser();
  return prisma.trip.findMany({
    where: {
      members: { some: { userId: user.id, inviteStatus: "ACCEPTED" } },
    },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export { canReadDiaryEntry };
