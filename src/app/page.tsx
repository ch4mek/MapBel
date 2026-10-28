import { connection } from "next/server";
import { auth } from "@/auth";
import { getMapPlaces, getMapZones } from "@/lib/catalog";
import { MapExplorer } from "@/components/map-explorer";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  await connection();
  const [session, sp] = await Promise.all([auth(), searchParams]);
  const userId = session?.user?.id ?? null;
  const [zones, places] = await Promise.all([getMapZones(userId), getMapPlaces(userId)]);
  const styleUrl = process.env.MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

  return (
    <>
      <h1 className="sr-only">Карта открытий Беларуси</h1>
      <MapExplorer
        zones={zones}
        places={places}
        styleUrl={styleUrl}
        isAuthed={!!userId}
        initialZoneSlug={sp.zone}
      />
    </>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
