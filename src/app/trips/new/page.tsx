import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TripCreateForm } from "@/components/trip-create-form";


export default async function NewTripPage({
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
    orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-2xl font-bold">Новая поездка</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        После старта состав обязательных мест фиксируется, и участники
        подтверждают визиты самостоятельно.
      </p>
      <div className="mt-4">
        <TripCreateForm
          preselectedPlaceId={sp.place}
          places={places.map((p) => ({
            id: p.id,
            name: p.name,
            zoneName: p.zone.name,
          }))}
        />
      </div>
    </div>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
