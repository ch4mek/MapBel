import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfileData } from "@/lib/profile";
import { ProfileView } from "@/components/profile-view";


export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const data = await getProfileData(session.user.id, session.user.id);
  if (!data) notFound();
  return <ProfileView data={data} isSelf />;
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
