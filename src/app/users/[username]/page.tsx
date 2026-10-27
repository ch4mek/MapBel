import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProfileData } from "@/lib/profile";
import { ProfileView } from "@/components/profile-view";


export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) notFound();

  const data = await getProfileData(target.id, viewerId);
  if (!data) notFound();
  return <ProfileView data={data} />;
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
