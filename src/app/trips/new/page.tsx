import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Route } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TripCreateForm } from "@/components/trip-create-form";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Новая поездка" };

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
    select: { id: true, name: true, category: true, zone: { select: { name: true } } },
    orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <Container size="md">
      <Link href="/trips" className="btn btn-subtle btn-sm -ml-3 mb-3">
        <ArrowLeft className="size-4" />
        Поездки
      </Link>
      <PageHeader
        title="Новая поездка"
        subtitle="Друзей пригласите после создания. После старта маршрут фиксируется."
        icon={Route}
      />
      <div className="card p-5 sm:p-7">
        <TripCreateForm
          preselectedPlaceId={sp.place}
          places={places.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            zoneName: p.zone.name,
          }))}
        />
      </div>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
