import Link from "next/link";
import type { ProfileData } from "@/lib/profile";
import { RANK_ICONS, RANK_LABELS } from "@/lib/ranks";

export function ProfileView({ data }: { data: ProfileData }) {
  const d = data;
  return (
    <div className="flex flex-col gap-4">
      <header className="card p-4">
        <h1 className="text-2xl font-bold">
          {d.user.displayName}{" "}
          <span className="text-base font-normal text-[var(--muted)]">
            @{d.user.username}
          </span>
        </h1>
        {d.user.bio && <p className="mt-1 text-sm">{d.user.bio}</p>}
        <p className="mt-1 text-xs text-[var(--muted)]">
          В MapBel с {d.user.createdAt.toLocaleDateString("ru-RU")}
          {d.user.homeCity ? ` · ${d.user.homeCity}` : ""}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 p-3">
            <dt className="text-xs text-[var(--muted)]">Уровень</dt>
            <dd className="text-xl font-bold">{d.level}</dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <dt className="text-xs text-[var(--muted)]">Всего XP</dt>
            <dd className="text-xl font-bold">{d.lifetimeXp}</dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <dt className="text-xs text-[var(--muted)]">XP за месяц</dt>
            <dd className="text-xl font-bold">{d.monthXp}</dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <dt className="text-xs text-[var(--muted)]">Уникальных мест</dt>
            <dd className="text-xl font-bold">{d.uniquePlaces}</dd>
          </div>
        </dl>
      </header>

      <section className="card p-4">
        <h2 className="text-base font-semibold">
          Открытые зоны ({d.zonesUnlocked}) · золото: {d.goldCount}
        </h2>
        {d.zoneProgress.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Зоны ещё не открыты.{" "}
            <Link href="/" className="text-[var(--brand)] underline">
              Выберите место на карте
            </Link>{" "}
            и нажмите «Я здесь».
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {d.zoneProgress.map((z) => (
              <li key={z.zoneId} className="flex items-center gap-2 rounded border p-2 text-sm">
                <span aria-hidden className="text-lg">
                  {RANK_ICONS[z.status]}
                </span>
                <span className="flex-1">{z.zoneName}</span>
                <span className="text-xs text-[var(--muted)]">
                  {RANK_LABELS[z.status]} · {z.uniquePlaces}/{z.publishedPlaces}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-base font-semibold">
          Достижения ({d.achievements.filter((a) => a.awardedAt).length}/
          {d.achievements.length})
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {d.achievements.map((a) => (
            <li
              key={a.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                a.awardedAt ? "" : "opacity-45"
              }`}
            >
              <span aria-hidden className="text-2xl">
                {a.awardedAt ? a.icon : "🔒"}
              </span>
              <span>
                <span className="block text-sm font-medium">{a.name}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {a.awardedAt
                    ? `получено ${a.awardedAt.toLocaleDateString("ru-RU")}`
                    : a.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Фотоальбом</h2>
          <Link href="/diary" className="text-sm text-[var(--brand)] underline">
            Все записи
          </Link>
        </div>
        {d.album.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            В альбоме пока нет фотографий.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {d.album.map((p) => (
              <li key={p.previewKey}>
                <Link href={`/diary/${p.entryId}`} className="group block overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${p.previewKey}`}
                    alt={p.caption ?? p.title}
                    className="h-32 w-full object-cover transition group-hover:scale-[1.03]"
                  />
                  <span className="block p-1.5 text-xs">
                    {p.placeName}
                    {p.tripDate ? ` · ${p.tripDate.toLocaleDateString("ru-RU")}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Друзья ({d.friendsCount})</h2>
          <Link href="/friends" className="text-sm text-[var(--brand)] underline">
            Друзья и сравнение
          </Link>
        </div>
      </section>
    </div>
  );
}
