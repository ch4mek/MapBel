"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/api";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

const placeSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug: латиница, цифры, дефис"),
  zoneId: z.string().min(1, "Выберите зону"),
  category: z.enum(["HISTORIC", "MUSEUM", "CASTLE", "NATURE", "ECOTRAIL", "GASTRO", "UNUSUAL"]),
  description: z.string().trim().min(1, "Введите описание").max(8000),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusM: z.coerce.number().int().min(20).max(2000).optional(),
  address: z.string().trim().max(300).optional(),
  openingHours: z.string().trim().max(300).optional(),
  priceInfo: z.string().trim().max(300).optional(),
  contacts: z.string().trim().max(300).optional(),
  officialUrl: z.string().trim().url("Некорректный URL").max(300).optional().or(z.literal("")),
  accessibility: z.string().trim().max(1000).optional(),
  arrivalTips: z.string().trim().max(1000).optional(),
  isDemo: z.boolean().default(true),
});

export async function upsertPlaceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const parsed = placeSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    zoneId: formData.get("zoneId"),
    category: formData.get("category"),
    description: formData.get("description"),
    lat: formData.get("lat"),
    lon: formData.get("lon"),
    radiusM: formData.get("radiusM") || undefined,
    address: formData.get("address") || undefined,
    openingHours: formData.get("openingHours") || undefined,
    priceInfo: formData.get("priceInfo") || undefined,
    contacts: formData.get("contacts") || undefined,
    officialUrl: formData.get("officialUrl") || "",
    accessibility: formData.get("accessibility") || undefined,
    arrivalTips: formData.get("arrivalTips") || undefined,
    isDemo: formData.get("isDemo") === "on" || formData.get("isDemo") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const d = parsed.data;
  const data = {
    name: d.name,
    slug: d.slug,
    zoneId: d.zoneId,
    category: d.category,
    description: d.description,
    lat: d.lat,
    lon: d.lon,
    radiusM: d.radiusM ?? null,
    address: d.address ?? null,
    openingHours: d.openingHours ?? null,
    priceInfo: d.priceInfo ?? null,
    contacts: d.contacts ?? null,
    officialUrl: d.officialUrl || null,
    accessibility: d.accessibility ?? null,
    arrivalTips: d.arrivalTips ?? null,
    isDemo: d.isDemo,
    verifiedAt: new Date(),
  };
  const place = id
    ? await prisma.place.update({ where: { id }, data })
    : await prisma.place.create({ data });
  revalidatePath("/editor");
  revalidatePath(`/places/${place.slug}`);
  return { ok: true, id: place.id };
}

/** Скрытие места не отнимает уже выданные награды (раздел 13 ТЗ). */
export async function setPlacePublicationAction(
  placeId: string,
  status: "PUBLISHED" | "HIDDEN" | "DRAFT",
): Promise<ActionResult> {
  await requireEditor();
  await prisma.place.update({
    where: { id: placeId },
    data: { publicationStatus: status },
  });
  revalidatePath("/editor");
  return { ok: true };
}

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(2000).optional(),
  silverThreshold: z.coerce.number().int().min(1).max(500),
  goldMinCount: z.coerce.number().int().min(0).max(500),
  // GeoJSON Polygon — упрощённый ввод через четыре угла bbox
  west: z.coerce.number().min(-180).max(180),
  east: z.coerce.number().min(-180).max(180),
  south: z.coerce.number().min(-90).max(90),
  north: z.coerce.number().min(-90).max(90),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLon: z.coerce.number().min(-180).max(180),
});

export async function upsertZoneAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    silverThreshold: formData.get("silverThreshold"),
    goldMinCount: formData.get("goldMinCount"),
    west: formData.get("west"),
    east: formData.get("east"),
    south: formData.get("south"),
    north: formData.get("north"),
    centerLat: formData.get("centerLat"),
    centerLon: formData.get("centerLon"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const d = parsed.data;
  const geometry = {
    type: "Polygon",
    coordinates: [
      [
        [d.west, d.north],
        [d.east, d.north],
        [d.east, d.south],
        [d.west, d.south],
        [d.west, d.north],
      ],
    ],
  };
  const data = {
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
    silverThreshold: d.silverThreshold,
    goldMinCount: d.goldMinCount,
    geometry,
    centerLat: d.centerLat,
    centerLon: d.centerLon,
    isDemo: true,
  };
  const zone = id
    ? await prisma.zone.update({ where: { id }, data })
    : await prisma.zone.create({ data });
  revalidatePath("/editor");
  return { ok: true, id: zone.id };
}

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  placeId: z.string().optional(),
  organizer: z.string().trim().max(160).optional(),
  officialUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]),
});

export async function upsertEventAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    placeId: formData.get("placeId") || undefined,
    organizer: formData.get("organizer") || undefined,
    officialUrl: formData.get("officialUrl") || "",
    status: formData.get("status") || "SCHEDULED",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const d = parsed.data;
  if (new Date(d.endsAt) <= new Date(d.startsAt)) {
    return { error: "Окончание должно быть позже начала" };
  }
  const data = {
    title: d.title,
    description: d.description ?? null,
    startsAt: new Date(d.startsAt),
    endsAt: new Date(d.endsAt),
    placeId: d.placeId || null,
    organizer: d.organizer ?? null,
    officialUrl: d.officialUrl || null,
    status: d.status,
    isDemo: true,
  };
  const evt = id
    ? await prisma.event.update({ where: { id }, data })
    : await prisma.event.create({ data });
  revalidatePath("/events");
  revalidatePath("/editor");
  return { ok: true, id: evt.id };
}

/**
 * Разбор предложений: ничего не публикуется автоматически.
 * NEW_PLACE требует зону; CORRECTION применяет только переданные поля.
 */
export async function resolveSuggestionAction(
  suggestionId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<ActionResult> {
  const editor = await requireEditor();
  const suggestion = await prisma.contentSuggestion.findUnique({
    where: { id: suggestionId },
  });
  if (!suggestion) return { error: "Предложение не найдено" };
  if (suggestion.status !== "PENDING") return { error: "Предложение уже разобрано" };

  if (decision === "APPROVED") {
    const payload = suggestion.payload as Record<string, unknown>;
    if (suggestion.type === "NEW_PLACE") {
      const zoneId = typeof payload.zoneId === "string" ? payload.zoneId : "";
      const placeSchema = z.object({
        name: z.string().min(1),
        category: z.enum(["HISTORIC", "MUSEUM", "CASTLE", "NATURE", "ECOTRAIL", "GASTRO", "UNUSUAL"]),
        description: z.string().min(1),
        lat: z.number(),
        lon: z.number(),
      });
      const parsed = placeSchema.safeParse(payload);
      if (!parsed.success || !zoneId) {
        return { error: "В предложении недостаточно данных для создания места" };
      }
      const slug = `suggested-${suggestion.id.slice(0, 8)}`;
      await prisma.place.create({
        data: {
          zoneId,
          slug,
          name: parsed.data.name,
          category: parsed.data.category,
          description: parsed.data.description,
          lat: parsed.data.lat,
          lon: parsed.data.lon,
          publicationStatus: "DRAFT", // редактор публикует отдельно
          isDemo: true,
          license: "Предложение пользователя (проверено редактором)",
        },
      });
    } else {
      if (!suggestion.targetPlaceId) return { error: "Нет места для исправления" };
      const update: Record<string, unknown> = { verifiedAt: new Date() };
      for (const key of ["name", "category", "description"] as const) {
        if (typeof payload[key] !== "undefined") update[key] = payload[key];
      }
      if (typeof payload.lat === "number") update.lat = payload.lat;
      if (typeof payload.lon === "number") update.lon = payload.lon;
      await prisma.place.update({
        where: { id: suggestion.targetPlaceId },
        data: update,
      });
    }
  }

  await prisma.contentSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: decision,
      editorComment: comment ?? null,
      reviewedById: editor.id,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/editor");
  return { ok: true };
}

export async function moderateReviewAction(
  reviewId: string,
  hide: boolean,
): Promise<ActionResult> {
  await requireEditor();
  await prisma.review.update({
    where: { id: reviewId },
    data: { moderationStatus: hide ? "HIDDEN" : "ACTIVE" },
  });
  revalidatePath("/editor");
  return { ok: true };
}
