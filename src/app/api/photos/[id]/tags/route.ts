import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, asyncRoute, requireUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { acceptedFriendIds } from "@/lib/acl";

const schema = z.object({ username: z.string().trim().toLowerCase().min(1) });

/** Отметить друга на фото (допущение 8: требуется его согласие). */
export const POST = asyncRoute(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id: photoId } = await ctx.params;
    const { username } = schema.parse(await req.json());

    const photo = await prisma.diaryPhoto.findUnique({
      where: { id: photoId },
      include: { entry: { select: { authorId: true } } },
    });
    if (!photo || photo.entry.authorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Отмечать можно только на своих фотографиях");
    }
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) throw new ApiError(404, "USER_NOT_FOUND", "Пользователь не найден");
    if (target.id === user.id) {
      throw new ApiError(422, "SELF_TAG", "Нельзя отметить себя");
    }
    const friends = await acceptedFriendIds(user.id);
    if (!friends.includes(target.id)) {
      throw new ApiError(422, "NOT_FRIEND", "Отмечать можно только друзей");
    }
    await prisma.photoTag.upsert({
      where: { photoId_taggedUserId: { photoId, taggedUserId: target.id } },
      create: { photoId, taggedUserId: target.id },
      update: { status: "PENDING", respondedAt: null },
    });
    return jsonOk({ ok: true }, 201);
  },
);
