import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareWithFriends } from "@/lib/compare";
import { respondFriendRequestAction, removeFriendAction } from "@/lib/actions/social";
import { FriendActions } from "@/components/friend-actions";
import { FriendSearchForm } from "@/components/friend-search";


export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const [incoming, outgoing, friends, compare] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: meId, status: "PENDING" },
      include: { requester: { select: { id: true, displayName: true, username: true } } },
    }),
    prisma.friendship.findMany({
      where: { requesterId: meId, status: "PENDING" },
      include: { addressee: { select: { displayName: true, username: true } } },
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: meId }, { addresseeId: meId }],
      },
      include: {
        requester: { select: { id: true, displayName: true, username: true } },
        addressee: { select: { id: true, displayName: true, username: true } },
      },
    }),
    compareWithFriends(meId),
  ]);

  const friendUsers = friends.map((f) =>
    f.requesterId === meId ? f.addressee : f.requester,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Друзья</h1>

      <section className="card p-4">
        <h2 className="text-base font-semibold">Найти по имени пользователя</h2>
        <FriendSearchForm />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Поиск по username или отображаемому имени. Email пользователей не
          раскрывается.
        </p>
      </section>

      {incoming.length > 0 && (
        <section className="card p-4">
          <h2 className="text-base font-semibold">Входящие заявки ({incoming.length})</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((fr) => (
              <li key={fr.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span>
                  <Link href={`/users/${fr.requester.username}`} className="underline">
                    {fr.requester.displayName}
                  </Link>{" "}
                  (@{fr.requester.username})
                </span>
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
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="card p-4">
          <h2 className="text-base font-semibold">Отправленные заявки ({outgoing.length})</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {outgoing.map((fr) => (
              <li key={fr.id}>
                {fr.addressee.displayName} (@{fr.addressee.username}) — ждёт ответа
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="text-base font-semibold">Мои друзья ({friendUsers.length})</h2>
        {friendUsers.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Пока никого. Отправьте заявку по имени пользователя.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {friendUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/users/${u.username}`} className="underline">
                  {u.displayName}
                </Link>{" "}
                <span className="text-[var(--muted)]">@{u.username}</span>
                <FriendActions
                  kind="remove"
                  respond={async () => {
                    "use server";
                    return removeFriendAction(u.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {friendUsers.length > 0 && (
        <section className="card overflow-x-auto p-4">
          <h2 className="text-base font-semibold">Сравнение за текущий месяц</h2>
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--muted)]">
                <th className="py-1.5">Участник</th>
                <th className="py-1.5">Открыто зон</th>
                <th className="py-1.5">Уникальных мест</th>
                <th className="py-1.5">Золото</th>
                <th className="py-1.5">XP за месяц</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((r) => (
                <tr key={r.userId} className={`border-t ${r.isMe ? "bg-emerald-50 font-medium" : ""}`}>
                  <td className="py-1.5">
                    <Link href={`/users/${r.username}`} className="underline">
                      {r.displayName}
                      {r.isMe ? " (вы)" : ""}
                    </Link>
                  </td>
                  <td className="py-1.5">{r.zonesUnlocked}</td>
                  <td className="py-1.5">{r.uniquePlaces}</td>
                  <td className="py-1.5">{r.goldCount}</td>
                  <td className="py-1.5">{r.monthXp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Сортировка по XP за месяц (Europe/Minsk); при равенстве — кто раньше
            получил первое начисление месяца. Глобального публичного рейтинга в
            MVP нет.
          </p>
        </section>
      )}
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
