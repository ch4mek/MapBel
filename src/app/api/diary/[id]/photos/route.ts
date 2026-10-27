import { NextRequest } from "next/server";
import { jsonOk, asyncRoute, requireUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { processPhotoUpload, PHOTO_ERROR_MESSAGES } from "@/lib/photos";
import { PHOTO_LIMITS } from "@/config/game";

/** Загрузка фотографий в свою запись (multipart, до 10 штук на запись). */
export const POST = asyncRoute(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id: entryId } = await ctx.params;
    const entry = await prisma.diaryEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.authorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Можно добавлять фото только в свои записи");
    }

    const existingCount = await prisma.diaryPhoto.count({ where: { entryId } });
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      throw new ApiError(400, "NO_FILES", "Файлы не переданы");
    }
    if (existingCount + files.length > PHOTO_LIMITS.maxPerEntry) {
      throw new ApiError(
        422,
        "TOO_MANY_PHOTOS",
        `Максимум ${PHOTO_LIMITS.maxPerEntry} фотографий на запись`,
      );
    }

    const maxSort = await prisma.diaryPhoto.aggregate({
      where: { entryId },
      _max: { sort: true },
    });
    let sort = (maxSort._max.sort ?? -1) + 1;

    const created: { id: string; previewKey: string; caption: string | null }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await processPhotoUpload(buffer);
      if (!result.ok) {
        throw new ApiError(
          422,
          result.error,
          `${file.name}: ${PHOTO_ERROR_MESSAGES[result.error]}`,
        );
      }
      const photo = await prisma.diaryPhoto.create({
        data: {
          entryId,
          storageKey: result.photo.fullKey,
          previewKey: result.photo.previewKey,
          width: result.photo.width,
          height: result.photo.height,
          caption: String(formData.get("caption") ?? "") || null,
          sort: sort++,
        },
      });
      created.push({ id: photo.id, previewKey: photo.previewKey, caption: photo.caption });
    }
    return jsonOk({ photos: created }, 201);
  },
);
