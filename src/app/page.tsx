import { auth } from "@/auth";
import { getMapPlaces, getMapZones } from "@/lib/catalog";
import { MapExplorer } from "@/components/map-explorer";


export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [zones, places] = await Promise.all([
    getMapZones(userId),
    getMapPlaces(userId),
  ]);
  const styleUrl =
    process.env.MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

  return (
    <div className="flex flex-col gap-4">
      <section className="card p-4">
        <h1 className="text-xl font-bold">Открывай Беларусь по зонам</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Подтверждайте посещения кнопкой «Я здесь», открывайте зоны (бронза →
          серебро → золото), копите достижения и путешествуйте вместе с
          друзьями. Выберите зону или место на карте.
        </p>
        {!session?.user && (
          <p className="mt-2 text-sm">
            <a href="/register" className="font-medium text-[var(--brand)] underline">
              Зарегистрируйтесь
            </a>
            , чтобы сохранять прогресс — карта и каталог доступны и без входа.
          </p>
        )}
      </section>
      <MapExplorer zones={zones} places={places} styleUrl={styleUrl} />
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
