import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Crown, Inbox, TrendingUp, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareWithFriends } from "@/lib/compare";
import { respondFriendRequestAction, removeFriendAction } from "@/lib/actions/social";
import { FriendActions } from "@/components/friend-actions";
import { FriendSearchForm } from "@/components/friend-search";
import { Avatar, Container, EmptyState, PageHeader, Section } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Друзья" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const [incoming, outgoing, friendships, compare] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: meId, status: "PENDING" },
      include: { requester: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: meId, status: "PENDING" },
      include: { addressee: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: meId }, { addresseeId: meId }] },
      include: {
        requester: { select: { id: true, displayName: true, username: true } },
        addressee: { select: { id: true, displayName: true, username: true } },
      },
    }),
    compareWithFriends(meId),
  ]);

  const friends = friendships
    .map((f) => (f.requesterId === meId ? f.addressee : f.requester))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));
  const statsById = new Map(compare.map((r) => [r.userId, r]));
  const maxXp = Math.max(1, ...compare.map((r) => r.monthXp));
  const monthName = new Date().toLocaleDateString("ru-RU", { month: "long", timeZone: "Europe/Minsk" });

  return (
    <Container>
      <PageHeader title="Друзья" subtitle="Путешествуйте вместе и сравнивайте прогресс" icon={Users} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section>
            <h2 className="mb-1 font-display text-[15px] font-semibold">Найти друга</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Поиск по имени пользователя или отображаемому имени. Email не раскрывается.
            </p>
            <FriendSearchForm />
          </Section>

          {friends.length > 0 && (
            <Section title={`Рейтинг за ${monthName}`} icon={TrendingUp} bodyClassName="p-0">
              <ol className="divide-y divide-zinc-100">
                {compare.map((r, i) => (
                  <li
                    key={r.userId}
                    className={cn("flex items-center gap-3 px-5 py-3.5", r.isMe && "bg-forest-50/60")}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
                        i === 0 ? "bg-gold-100 text-gold-700" : "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      {i === 0 ? <Crown className="size-4" /> : i + 1}
                    </span>
                    <Avatar name={r.displayName} seed={r.username} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/users/${r.username}`} className="block truncate text-sm font-semibold hover:underline">
                        {r.displayName}
                        {r.isMe && <span className="font-normal text-zinc-500"> · вы</span>}
                      </Link>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-forest-400 to-forest-700"
                          style={{ width: `${Math.round((r.monthXp / maxXp) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <dl className="hidden shrink-0 grid-cols-3 gap-4 text-center sm:grid">
                      <div>
                        <dt className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Зоны</dt>
                        <dd className="text-sm font-bold">{r.zonesUnlocked}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Места</dt>
                        <dd className="text-sm font-bold">{r.uniquePlaces}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Золото</dt>
                        <dd className="text-sm font-bold">{r.goldCount}</dd>
                      </div>
                    </dl>
                    <span className="w-16 shrink-0 text-right font-display text-sm font-bold text-forest-700">
                      {r.monthXp} XP
                    </span>
                  </li>
                ))}
              </ol>
              <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400">
                Очки за календарный месяц (Минск). При равенстве выше тот, кто раньше набрал первые очки.
                Сравнение только с друзьями — общего рейтинга нет.
              </p>
            </Section>
          )}

          <Section title={`Мои друзья · ${friends.length}`} icon={Users} bodyClassName={friends.length ? "p-2" : undefined}>
            {friends.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Пока никого"
                text="Найдите друзей по имени пользователя, чтобы вместе планировать поездки и сравнивать прогресс."
                className="border-0 bg-zinc-50 py-8"
              />
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {friends.map((u) => {
                  const s = statsById.get(u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-zinc-50">
                      <Avatar name={u.displayName} seed={u.username} className="size-11 text-sm" />
                      <Link href={`/users/${u.username}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold hover:underline">{u.displayName}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          @{u.username}
                          {s ? ` · ${s.zonesUnlocked} зон · ${s.uniquePlaces} мест` : ""}
                        </span>
                      </Link>
                      <FriendActions
                        kind="remove"
                        respond={async () => {
                          "use server";
                          return removeFriendAction(u.id);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Section title="Входящие заявки" icon={Inbox}>
            {incoming.length === 0 ? (
              <p className="text-sm text-zinc-500">Новых заявок нет.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {incoming.map((fr) => (
                  <li key={fr.id} className="flex flex-wrap items-center gap-3">
                    <Avatar name={fr.requester.displayName} seed={fr.requester.username} />
                    <Link href={`/users/${fr.requester.username}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{fr.requester.displayName}</span>
                      <span className="block truncate text-xs text-zinc-500">@{fr.requester.username}</span>
                    </Link>
                    <FriendActions
                      kind="respond"
                      respond={async (accept) => {
                        "use server";
                        return respondFriendRequestAction(fr.id, accept);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Отправленные" icon={Clock}>
              <ul className="flex flex-col gap-3">
                {outgoing.map((fr) => (
                  <li key={fr.id} className="flex items-center gap-3">
                    <Avatar name={fr.addressee.displayName} seed={fr.addressee.username} className="size-8 text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{fr.addressee.displayName}</span>
                      <span className="block text-xs text-zinc-500">ждёт ответа</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>
      </div>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
