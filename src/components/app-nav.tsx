"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Lightbulb,
  LogOut,
  Map as MapIcon,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

interface NavUser {
  displayName: string;
  username: string;
  role: string;
  level: number;
  xp: number;
}

interface NavBadges {
  friends: number;
  trips: number;
  diary: number;
}

const LINKS: { href: string; label: string; icon: LucideIcon; badge?: keyof NavBadges }[] = [
  { href: "/", label: "Карта", icon: MapIcon },
  { href: "/diary", label: "Дневник", icon: BookOpen, badge: "diary" },
  { href: "/trips", label: "Поездки", icon: Route, badge: "trips" },
  { href: "/friends", label: "Друзья", icon: Users, badge: "friends" },
  { href: "/events", label: "События", icon: CalendarDays },
];

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MapBel — на главную">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-forest-500 to-forest-800 text-white shadow-md shadow-forest-900/25">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <path d="m9.5 10 1.8 1.8L14.8 8" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-zinc-900">
        Map<span className="text-forest-600">Bel</span>
      </span>
    </Link>
  );
}

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] leading-none font-bold text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}

function UserMenu({ user }: { user: NavUser }) {
  const pathname = usePathname();
  // Меню привязано к пути, на котором его открыли: при переходе оно закрывается само
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    setOpenedAt(next ? pathname : null);
  };
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenedAt(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedAt(null);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const xpInLevel = user.xp % 100;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pr-2.5 pl-1 transition hover:border-zinc-300 focus-visible:ring-4 focus-visible:ring-forest-500/25 focus-visible:outline-none"
      >
        <Avatar name={user.displayName} seed={user.username} className="size-8 text-[11px]" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-32 truncate text-[13px] leading-tight font-semibold text-zinc-900">
            {user.displayName}
          </span>
          <span className="block text-[11px] leading-tight text-zinc-500">Уровень {user.level}</span>
        </span>
        <ChevronDown className={cn("size-4 text-zinc-400 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 animate-pop rounded-2xl border border-zinc-200 bg-white p-2 shadow-float"
        >
          <div className="rounded-xl bg-gradient-to-br from-forest-700 to-forest-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <Avatar name={user.displayName} seed={user.username} className="size-11 text-sm ring-2 ring-white/30" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.displayName}</p>
                <p className="truncate text-xs text-white/70">@{user.username}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-semibold">Уровень {user.level}</span>
              <span className="text-white/75">{xpInLevel}/100 XP</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-gold-500" style={{ width: `${xpInLevel}%` }} />
            </div>
          </div>
          <nav className="mt-1.5 flex flex-col" aria-label="Меню аккаунта">
            <MenuLink href="/profile" icon={UserRound}>Мой профиль</MenuLink>
            <MenuLink href="/suggest" icon={Lightbulb}>Предложить место</MenuLink>
            {user.role === "EDITOR" && (
              <MenuLink href="/editor" icon={ShieldCheck}>Панель редактора</MenuLink>
            )}
            <MenuLink href="/settings" icon={Settings}>Настройки</MenuLink>
            <form action={logoutAction} className="mt-1 border-t border-zinc-100 pt-1">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" aria-hidden />
                Выйти
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
    >
      <Icon className="size-4 text-zinc-400" aria-hidden />
      {children}
    </Link>
  );
}

export function AppNav({
  user,
  badges,
}: {
  user: NavUser | null;
  badges?: NavBadges;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-6 px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition",
                    active
                      ? "bg-forest-50 text-forest-800"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <l.icon className="size-[18px]" aria-hidden />
                  {l.label}
                  {l.badge && badges && <Count n={badges[l.badge]} />}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <Link href="/login" className="btn btn-subtle btn-sm sm:h-10 sm:px-4 sm:text-sm">
                  Войти
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm sm:h-10 sm:px-4 sm:text-sm">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Мобильная нижняя панель: без hover, крупные цели нажатия */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Мобильная навигация"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            const n = l.badge && badges ? badges[l.badge] : 0;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                  active ? "text-forest-700" : "text-zinc-500",
                )}
              >
                <span
                  className={cn(
                    "relative grid h-8 w-14 place-items-center rounded-full transition",
                    active && "bg-forest-50",
                  )}
                >
                  <l.icon className="size-[21px]" aria-hidden />
                  {n > 0 && (
                    <span className="absolute -top-0.5 right-2.5 size-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function AppNavSkeleton() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-6 px-4 sm:px-6">
        <Logo />
        <div className="ml-auto h-10 w-36 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </header>
  );
}
