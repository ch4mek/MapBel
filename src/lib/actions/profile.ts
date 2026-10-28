"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";

export interface ProfileFormState {
  error?: string;
  ok?: boolean;
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Имя — минимум 2 символа").max(40),
  bio: z.string().trim().max(300, "О себе — не больше 300 символов").optional(),
  homeCity: z.string().trim().max(60).optional(),
});

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    homeCity: formData.get("homeCity") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const { displayName, bio, homeCity } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName,
      profile: {
        upsert: {
          create: { bio: bio ?? null, homeCity: homeCity ?? null },
          update: { bio: bio ?? null, homeCity: homeCity ?? null },
        },
      },
    },
  });
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { ok: true };
}
