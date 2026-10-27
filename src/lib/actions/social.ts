"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { REVIEW_RULES } from "@/config/game";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

// ---------- Друзья (раздел 9 ТЗ) ----------

export async function sendFriendRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const raw = String(formData.get("query") ?? "").trim().toLowerCase();
  if (!raw) return { error: "Введите имя пользователя" };
  // Поиск по username или displayName; email не раскрывается.
  const target = (await prisma.user.findFirst({
    where: { OR: [{ username: raw }, { displayName: raw }] },
  })) ?? (await prisma.user.findFirst({
    where: { displayName: { contains: raw } },
    take: 2,
  }));
  if (!target) return { error: "Пользователь не найден" };
  if (target.id === user.id) return { error: "Нельзя добавить себя" };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: user.id },
      ],
    },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") return { error: "Вы уже друзья" };
    if (existing.status === "PENDING") {
      if (existing.addresseeId === user.id) {
        // Встречная заявка — сразу принимаем.
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        revalidatePath("/friends");
        return { ok: true };
      }
      return { error: "Заявка уже отправлена" };
    }
    // REJECTED — разрешаем отправить заново.
    await prisma.friendship.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        requesterId: user.id,
        addresseeId: target.id,
        respondedAt: null,
      },
    });
    revalidatePath("/friends");
    return { ok: true };
  }
  await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: target.id, status: "PENDING" },
  });
  revalidatePath("/friends");
  return { ok: true };
}

export async function respondFriendRequestAction(
  friendshipId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const fr = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!fr || fr.addresseeId !== user.id) {
    return { error: "Заявка не найдена" };
  }
  if (fr.status !== "PENDING") return { error: "Заявка уже обработана" };
  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
  });
  revalidatePath("/friends");
  return { ok: true };
}

export async function removeFriendAction(userId: string): Promise<ActionResult> {
  const me = await requireUser();
  const fr = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: me.id, addresseeId: userId },
        { requesterId: userId, addresseeId: me.id },
      ],
    },
  });
  if (!fr) return { error: "Дружба не найдена" };
  await prisma.friendship.delete({ where: { id: fr.id } });
  revalidatePath("/friends");
  return { ok: true };
}

// ---------- Отзывы (раздел 11 ТЗ) ----------

const reviewSchema = z.object({
  placeId: z.string().min(1),
  rating: z.coerce
    .number()
    .int()
    .min(REVIEW_RULES.minRating)
    .max(REVIEW_RULES.maxRating),
  text: z.string().trim().max(5000).optional(),
  tips: z.string().trim().max(2000).optional(),
});

export async function upsertReviewAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse({
    placeId: formData.get("placeId"),
    rating: formData.get("rating"),
    text: formData.get("text") || undefined,
    tips: formData.get("tips") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const place = await prisma.place.findUnique({
    where: { id: parsed.data.placeId },
    select: { id: true, slug: true },
  });
  if (!place) return { error: "Место не найдено" };

  await prisma.review.upsert({
    where: { userId_placeId: { userId: user.id, placeId: place.id } },
    create: {
      userId: user.id,
      placeId: place.id,
      rating: parsed.data.rating,
      text: parsed.data.text ?? null,
      tips: parsed.data.tips ?? null,
    },
    update: {
      rating: parsed.data.rating,
      text: parsed.data.text ?? null,
      tips: parsed.data.tips ?? null,
    },
  });
  revalidatePath(`/places/${place.slug}`);
  return { ok: true };
}

// ---------- Поездки (раздел 9 ТЗ) ----------

const tripSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(120),
  description: z.string().trim().max(3000).optional(),
  tripDate: z.string().min(1, "Укажите дату"),
  placeIds: z.array(z.string()).default([]),
});

export async function createTripAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const placeIds = formData.getAll("placeIds").map(String).filter(Boolean);
  const parsed = tripSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    tripDate: formData.get("tripDate"),
    placeIds,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const trip = await prisma.trip.create({
    data: {
      organizerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      tripDate: new Date(parsed.data.tripDate),
      members: {
        create: { userId: user.id, inviteStatus: "ACCEPTED", respondedAt: new Date() },
      },
      places: {
        create: parsed.data.placeIds.map((placeId, i) => ({
          placeId,
          sort: i,
          isRequired: true,
        })),
      },
    },
  });
  revalidatePath("/trips");
  return { ok: true, id: trip.id };
}

async function organizerTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.organizerId !== userId) return null;
  return trip;
}

/** Маршрут редактирует организатор только до старта (раздел 9 ТЗ). */
export async function addTripPlaceAction(tripId: string, placeId: string): Promise<ActionResult> {
  const user = await requireUser();
  const trip = await organizerTrip(tripId, user.id);
  if (!trip) return { error: "Только организатор управляет маршрутом" };
  if (trip.status !== "PLANNED") {
    return { error: "После старта маршрут зафиксирован" };
  }
  const count = await prisma.tripPlace.count({ where: { tripId } });
  await prisma.tripPlace.upsert({
    where: { tripId_placeId: { tripId, placeId } },
    create: { tripId, placeId, sort: count },
    update: {},
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function removeTripPlaceAction(tripId: string, placeId: string): Promise<ActionResult> {
  const user = await requireUser();
  const trip = await organizerTrip(tripId, user.id);
  if (!trip) return { error: "Только организатор управляет маршрутом" };
  if (trip.status !== "PLANNED") {
    return { error: "После старта маршрут зафиксирован" };
  }
  await prisma.tripPlace.delete({
    where: { tripId_placeId: { tripId, placeId } },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function inviteToTripAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const trip = await organizerTrip(tripId, user.id);
  if (!trip) return { error: "Приглашает только организатор" };
  if (trip.status === "CANCELLED") return { error: "Поездка отменена" };
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return { error: "Пользователь не найден" };
  if (target.id === user.id) return { error: "Организатор уже участник" };
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId, userId: target.id } },
    create: { tripId, userId: target.id, inviteStatus: "PENDING" },
    update: { inviteStatus: "PENDING", respondedAt: null },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function respondTripInviteAction(
  tripId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: user.id } },
  });
  if (!membership) return { error: "Приглашение не найдено" };
  if (membership.inviteStatus !== "PENDING") {
    return { error: "Приглашение уже обработано" };
  }
  await prisma.tripMember.update({
    where: { id: membership.id },
    data: { inviteStatus: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function startTripAction(tripId: string): Promise<ActionResult> {
  const user = await requireUser();
  const trip = await organizerTrip(tripId, user.id);
  if (!trip) return { error: "Стартует только организатор" };
  if (trip.status !== "PLANNED") return { error: "Поездка уже начата" };
  const requiredCount = await prisma.tripPlace.count({
    where: { tripId, isRequired: true },
  });
  if (requiredCount === 0) {
    return { error: "Добавьте обязательные места перед стартом" };
  }
  await prisma.trip.update({
    where: { id: tripId },
    data: { status: "ACTIVE", startedAt: new Date() },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function cancelTripAction(tripId: string): Promise<ActionResult> {
  const user = await requireUser();
  const trip = await organizerTrip(tripId, user.id);
  if (!trip) return { error: "Отменяет только организатор" };
  if (trip.status === "CANCELLED") return { error: "Поездка уже отменена" };
  await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

/** Персональный прогресс при выходе не откатывается (раздел 9 ТЗ). */
export async function leaveTripAction(tripId: string): Promise<ActionResult> {
  const user = await requireUser();
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "Поездка не найдена" };
  if (trip.organizerId === user.id) {
    return { error: "Организатор не может выйти — отмените поездку" };
  }
  await prisma.tripMember.delete({
    where: { tripId_userId: { tripId, userId: user.id } },
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

// ---------- Предложения мест и правок (раздел 11 ТЗ) ----------

const suggestionPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z
    .enum(["HISTORIC", "MUSEUM", "CASTLE", "NATURE", "ECOTRAIL", "GASTRO", "UNUSUAL"])
    .optional(),
  description: z.string().trim().max(5000).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  zoneId: z.string().optional(),
});

export async function createSuggestionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const type = String(formData.get("type") ?? "NEW_PLACE");
  const targetPlaceId = String(formData.get("targetPlaceId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const parsed = suggestionPayloadSchema.safeParse({
    name: formData.get("name") || undefined,
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    lat: formData.get("lat") || undefined,
    lon: formData.get("lon") || undefined,
    zoneId: formData.get("zoneId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  if (type === "CORRECTION" && !targetPlaceId) {
    return { error: "Укажите место для исправления" };
  }
  if (type !== "CORRECTION") {
    if (!parsed.data.zoneId) return { error: "Выберите зону" };
    if (!parsed.data.name || !parsed.data.description || parsed.data.lat === undefined || parsed.data.lon === undefined) {
      return { error: "Заполните название, описание и координаты" };
    }
  }
  await prisma.contentSuggestion.create({
    data: {
      type: type === "CORRECTION" ? "CORRECTION" : "NEW_PLACE",
      authorId: user.id,
      targetPlaceId,
      payload: parsed.data,
      note,
    },
  });
  revalidatePath("/editor");
  return { ok: true };
}
