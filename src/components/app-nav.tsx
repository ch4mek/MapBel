"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/", label: "Карта", icon: "🗺️" },
  { href: "/diary", label: "Дневник", icon: "📖" },
  { href: "/friends", label: "Друзья", icon: "👥" },
  { href: "/trips", label: "Поездки", icon: "🚩" },
  { href: "/events", label: "События", icon: "🎉" },
];

export function AppNav({
  user,
}: {
  user: { displayName: string; username: string; role: string } | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Десктоп: горизонтальные ссылки */}
      <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Основная навигация">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              isActive(l.href)
                ? "bg-[var(--brand)] text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {user.role === "EDITOR" && (
                <Link href="/editor" className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
                  Редактор
                </Link>
              )}
              <Link
                href="/profile"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive("/profile") ? "bg-[var(--brand)] text-white" : "hover:bg-gray-100"
                }`}
              >
                👤 {user.displayName}
              </Link>
              <form action={logoutAction}>
                <button className="btn btn-ghost !min-h-0 !px-2.5 !py-1.5" type="submit">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !min-h-0 !px-3 !py-1.5">
                Вход
              </Link>
              <Link href="/register" className="btn btn-primary !min-h-0 !px-3 !py-1.5">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Мобильный: нижняя панель (не требует hover) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden"
        aria-label="Мобильная навигация"
      >
        <div className="grid grid-cols-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive(l.href) ? "text-[var(--brand)] font-semibold" : "text-[var(--muted)]"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {l.icon}
              </span>
              {l.label}
            </Link>
          ))}
          <Link
            href={user ? "/profile" : "/login"}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive("/profile") ? "text-[var(--brand)] font-semibold" : "text-[var(--muted)]"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {user ? "👤" : "🔑"}
            </span>
            {user ? "Профиль" : "Вход"}
          </Link>
        </div>
      </nav>

      {user && (
        <Link
          href="/settings"
          className="ml-auto text-sm underline decoration-dotted md:hidden"
          aria-label="Настройки и выход"
        >
          ⚙️
        </Link>
      )}
      {!user && (
        <Link
          href="/login"
          className="ml-auto text-sm font-medium text-[var(--brand)] md:hidden"
        >
          Вход
        </Link>
      )}
    </>
  );
}
