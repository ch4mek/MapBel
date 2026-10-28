import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EyeOff, Globe, LocateFixed, LogOut, Mail, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/lib/actions/auth";
import { ProfileForm } from "@/components/profile-form";
import { Container, PageHeader, Section } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { displayName: true, username: true, email: true, profile: true },
  });
  if (!user) redirect("/login");

  return (
    <Container size="md">
      <PageHeader title="Настройки" subtitle={`@${user.username}`} icon={Settings} />

      <div className="flex flex-col gap-6">
        <Section title="Профиль" icon={UserRound}>
          <ProfileForm
            displayName={user.displayName}
            bio={user.profile?.bio ?? null}
            homeCity={user.profile?.homeCity ?? null}
          />
        </Section>

        <Section title="Приватность" icon={ShieldCheck}>
          <p className="text-sm text-zinc-600">
            Видимость задаётся для каждой записи дневника отдельно и сразу применяется ко всем её
            фотографиям — включая уже загруженные.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { icon: EyeOff, title: "Только мне", text: "Никто, кроме вас" },
              { icon: Users, title: "Друзьям", text: "Вариант по умолчанию" },
              { icon: Globe, title: "Всем", text: "Любой посетитель" },
            ].map((v) => (
              <li key={v.title} className="rounded-2xl bg-zinc-50 p-3.5">
                <v.icon className="size-5 text-forest-700" aria-hidden />
                <p className="mt-2 text-sm font-semibold">{v.title}</p>
                <p className="text-xs text-zinc-500">{v.text}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex flex-col gap-3 text-sm text-zinc-600">
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-zinc-400" />
              Ваш email ({user.email}) никому не показывается — друзья находят вас по имени пользователя.
            </li>
            <li className="flex gap-3">
              <LocateFixed className="mt-0.5 size-4 shrink-0 text-zinc-400" />
              Геопозиция запрашивается только по нажатию «Я здесь». Точные координаты проверок не публикуются,
              фонового отслеживания нет.
            </li>
          </ul>
        </Section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Выйти из аккаунта</p>
            <p className="text-sm text-zinc-500">Прогресс сохранится — он привязан к аккаунту.</p>
          </div>
          <form action={logoutAction}>
            <button className="btn btn-danger-soft" type="submit">
              <LogOut className="size-4" />
              Выйти
            </button>
          </form>
        </section>
      </div>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
