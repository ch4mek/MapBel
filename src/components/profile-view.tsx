import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  MapPinned,
  Medal,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { ProfileData } from "@/lib/profile";
import { RankBadge, RankMedal } from "@/components/ui/rank";
import { Avatar, EmptyState, ProgressBar, Section, StatTile } from "@/components/ui/primitives";
import { formatDate, formatDateShort, shortZoneName } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ProfileView({ data, isSelf }: { data: ProfileData; isSelf: boolean }) {
  const d = data;
  const xpInLevel = d.lifetimeXp % 100;
  const earned = d.achievements.filter((a) => a.awardedAt).length;

  return (
    <div className="pb-10">
      {/* Обложка профиля */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 text-white">
        <MapPinned className="absolute -right-12 -bottom-16 size-80 text-white/[0.05]" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:py-12">
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar
              name={d.user.displayName}
              seed={d.user.username}
              className="size-20 text-2xl ring-4 ring-white/20 sm:size-24 sm:text-3xl"
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{d.user.displayName}</h1>
              <p className="text-sm text-white/70">
                @{d.user.username} · в MapBel с {formatDate(d.user.createdAt)}
              </p>
              {d.user.bio && <p className="mt-2 max-w-lg text-sm text-white/85">{d.user.bio}</p>}
            </div>
          </div>
          <div className="w-full rounded-2xl bg-white/10 p-4 backdrop-blur md:w-72">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-forest-200 uppercase">Уровень</p>
                <p className="font-display text-3xl font-bold">{d.level}</p>
              </div>
              <p className="text-sm text-white/75">{xpInLevel} / 100 XP</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gold-500" style={{ width: `${xpInLevel}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/60">До уровня {d.level + 1}: {100 - xpInLevel} XP</p>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-6 flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Zap} label="Всего XP" value={d.lifetimeXp} accent="gold" hint={`за месяц: ${d.monthXp}`} />
          <StatTile icon={MapPinned} label="Открыто зон" value={d.zonesUnlocked} accent="forest" />
          <StatTile icon={Medal} label="Уникальных мест" value={d.uniquePlaces} accent="sky" />
          <StatTile icon={Trophy} label="Золотых зон" value={d.goldCount} accent="rose" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Section title="Открытые зоны" icon={MapPinned}>
            {d.zoneProgress.length === 0 ? (
              <EmptyState
                icon={MapPinned}
                title="Карта пока серая"
                text={isSelf ? "Выберите место на карте, приезжайте и нажмите «Я здесь»." : "Здесь появятся открытые зоны."}
                action={isSelf ? <Link href="/" className="btn btn-primary btn-sm">Открыть карту</Link> : undefined}
                className="border-0 bg-zinc-50 py-8"
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {d.zoneProgress.map((z) => (
                  <li key={z.zoneId}>
                    <Link
                      href={`/?zone=${z.zoneSlug}`}
                      className="group flex items-center gap-3 rounded-2xl border border-zinc-100 p-3 transition hover:border-zinc-200 hover:bg-zinc-50"
                    >
                      <RankMedal rank={z.status} className="size-11" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{shortZoneName(z.zoneName)}</span>
                          <RankBadge rank={z.status} size="sm" />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <ProgressBar value={z.uniquePlaces} max={Math.max(1, z.publishedPlaces)} className="h-1.5" />
                          <span className="shrink-0 text-[11px] text-zinc-500">
                            {z.uniquePlaces}/{z.publishedPlaces}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Достижения"
            icon={Award}
            actions={<span className="text-xs font-semibold text-zinc-500">{earned} из {d.achievements.length}</span>}
          >
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {d.achievements.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border p-3 text-center transition",
                    a.awardedAt
                      ? "border-gold-100 bg-gradient-to-b from-gold-50 to-white"
                      : "border-zinc-100 bg-zinc-50/60",
                  )}
                  title={a.description}
                >
                  <span
                    className={cn(
                      "grid size-12 place-items-center rounded-2xl text-2xl",
                      a.awardedAt ? "bg-white shadow-sm" : "bg-zinc-100 grayscale opacity-50",
                    )}
                    aria-hidden
                  >
                    {a.icon}
                  </span>
                  <span className={cn("mt-2 text-xs leading-tight font-bold", a.awardedAt ? "text-zinc-900" : "text-zinc-500")}>
                    {a.name}
                  </span>
                  <span className="mt-1 text-[11px] leading-tight text-zinc-500">
                    {a.awardedAt ? formatDateShort(a.awardedAt) : a.description}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section
          title="Фотоальбом"
          icon={Camera}
          actions={
            isSelf ? (
              <Link href="/diary" className="flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
                Дневник <ArrowRight className="size-3.5" />
              </Link>
            ) : undefined
          }
        >
          {d.album.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="В альбоме пока пусто"
              text={isSelf ? "Добавьте фото к записи дневника — они появятся здесь." : "Здесь появятся доступные вам фотографии."}
              action={isSelf ? <Link href="/diary/new" className="btn btn-primary btn-sm">Новая запись</Link> : undefined}
              className="border-0 bg-zinc-50 py-8"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {d.album.map((p) => (
                <li key={p.previewKey}>
                  <Link href={`/diary/${p.entryId}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${p.previewKey}`}
                      alt={p.caption ?? p.title}
                      className="size-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8 text-white">
                      <span className="block truncate text-xs font-semibold">{p.placeName}</span>
                      {p.tripDate && <span className="block text-[11px] text-white/75">{formatDateShort(p.tripDate)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="grid gap-3 sm:grid-cols-2">
          {isSelf && (
            <Link href="/diary" className="card group flex items-center gap-4 p-5 transition hover:shadow-float">
              <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <BookOpen className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">Дневник путешествий</span>
                <span className="text-sm text-zinc-500">{d.entriesCount} записей</span>
              </span>
              <ArrowRight className="size-5 text-zinc-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
            </Link>
          )}
          <Link href="/friends" className="card group flex items-center gap-4 p-5 transition hover:shadow-float">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <Users className="size-6" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{isSelf ? "Друзья и сравнение" : "Друзья"}</span>
              <span className="text-sm text-zinc-500">{d.friendsCount} в друзьях</span>
            </span>
            <ArrowRight className="size-5 text-zinc-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
