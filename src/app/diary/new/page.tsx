import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EntryEditor } from "@/components/entry-editor";
import { listMyTripsForEntry } from "@/lib/actions/diary";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Новая запись" };

export default async function NewDiaryEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; trip?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const [places, trips] = await Promise.all([
    prisma.place.findMany({
      where: { publicationStatus: "PUBLISHED" },
      select: { id: true, name: true, zone: { select: { name: true } } },
      orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
    }),
    listMyTripsForEntry(),
  ]);

  return (
    <Container size="md">
      <Link href="/diary" className="btn btn-subtle btn-sm -ml-3 mb-3">
        <ArrowLeft className="size-4" />
        Дневник
      </Link>
      <PageHeader
        title="Новая запись"
        subtitle="Одна запись — одно место. Фотографии добавите на следующем шаге."
        icon={PenLine}
      />
      <div className="card p-5 sm:p-7">
        <EntryEditor
          mode="create"
          preselectedPlaceId={sp.place}
          preselectedTripId={sp.trip}
          places={places.map((p) => ({ id: p.id, name: p.name, zoneName: p.zone.name }))}
          trips={trips.map((t) => ({ id: t.id, title: t.title }))}
        />
      </div>
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
