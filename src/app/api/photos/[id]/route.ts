import { NextRequest } from "next/server";
import { jsonOk, asyncRoute, requireUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

/** Удаление своей фотографии (вместе с файлами и отметками). */
export const DELETE = asyncRoute(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const photo = await prisma.diaryPhoto.findUnique({
      where: { id },
      include: { entry: { select: { authorId: true } } },
    });
    if (!photo || photo.entry.authorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Можно удалять только свои фотографии");
    }
    await prisma.diaryPhoto.delete({ where: { id } });
    await deleteFile(photo.storageKey).catch(() => undefined);
    await deleteFile(photo.previewKey).catch(() => undefined);
    return jsonOk({ ok: true });
  },
);

/** Подпись фотографии. */
export const PATCH = asyncRoute(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const photo = await prisma.diaryPhoto.findUnique({
      where: { id },
      include: { entry: { select: { authorId: true } } },
    });
    if (!photo || photo.entry.authorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Можно менять только свои фотографии");
    }
    const body = (await req.json()) as { caption?: string };
    await prisma.diaryPhoto.update({
      where: { id },
      data: { caption: (body.caption ?? "").trim().slice(0, 300) || null },
    });
    return jsonOk({ ok: true });
  },
);
