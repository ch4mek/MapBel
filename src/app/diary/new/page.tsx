import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EntryEditor } from "@/components/entry-editor";
import { listMyTripsForEntry } from "@/lib/actions/diary";


export default async function NewDiaryEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const places = await prisma.place.findMany({
    where: { publicationStatus: "PUBLISHED" },
    select: { id: true, name: true, zone: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const trips = await listMyTripsForEntry();

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-2xl font-bold">Новая запись</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Запись относится к одному месту и может быть привязана к поездке.
        Фотографии добавите на следующем шаге.
      </p>
      <div className="mt-4">
        <EntryEditor
          mode="create"
          preselectedPlaceId={sp.place}
          places={places.map((p) => ({
            id: p.id,
            name: p.name,
            zoneName: p.zone.name,
          }))}
          trips={trips.map((t) => ({ id: t.id, title: t.title }))}
        />
      </div>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
