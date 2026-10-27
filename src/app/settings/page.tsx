import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/actions/auth";


export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-semibold">Аккаунт</h2>
        <p className="mt-1 text-sm">
          {session.user.name} (@{session.user.username})
        </p>
        <p className="text-sm text-[var(--muted)]">Email скрыт от других пользователей.</p>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-semibold">Приватность дневника</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Видимость задаётся для каждой записи отдельно: «только мне», «друзьям»
          или «всем». По умолчанию новые записи видны друзьям. Точные координаты
          проверок нигде не публикуются.
        </p>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-semibold">Геолокация</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Координаты запрашиваются только в момент нажатия «Я здесь». Фоновое
          отслеживание и публикация геопозиции не выполняются.
        </p>
      </section>

      <form action={logoutAction} className="mt-4">
        <button className="btn btn-danger" type="submit">
          Выйти из аккаунта
        </button>
      </form>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
