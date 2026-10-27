import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, asyncRoute, requireUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({ placeId: z.string().min(1) });

/**
 * Демо-симуляция координат: возвращает контрольную точку места.
 * Явно маркированный серверный режим для local development:
 * работает только при NODE_ENV != production и DEMO_GEO_ENABLED=true.
 */
export const POST = asyncRoute(async (req: NextRequest) => {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.DEMO_GEO_ENABLED !== "true"
  ) {
    throw new ApiError(403, "DEMO_DISABLED", "Демо-режим геопозиции отключён");
  }
  await requireUser();
  const { placeId } = schema.parse(await req.json());
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place || place.publicationStatus !== "PUBLISHED") {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Место не найдено");
  }
  return jsonOk({
    latitude: (place.checkpointLat ?? place.lat).toNumber(),
    longitude: (place.checkpointLon ?? place.lon).toNumber(),
    // Точность демо-позиции проходит серверный лимит 100 м.
    accuracy: 10,
    positionTimestamp: Date.now(),
  });
});
