import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, Lightbulb, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SuggestForm } from "@/components/suggest-form";
import { Container, PageHeader, Pill, Section } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Предложить место" };

const STATUS = {
  PENDING: { label: "На проверке", tone: "info" },
  APPROVED: { label: "Принято", tone: "success" },
  REJECTED: { label: "Отклонено", tone: "danger" },
} as const;

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const [zones, places, mine] = await Promise.all([
    prisma.zone.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.place.findMany({
      where: { publicationStatus: "PUBLISHED" },
      select: { id: true, name: true, zone: { select: { name: true } } },
      orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.contentSuggestion.findMany({
      where: { authorId: session.user.id },
      include: { targetPlace: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <Container size="md">
      <PageHeader
        title="Предложить место"
        subtitle="Знаете интересное место или нашли ошибку? Редакторы проверят и добавят."
        icon={Lightbulb}
      />

      <div className="card p-5 sm:p-7">
        <SuggestForm
          zones={zones}
          places={places.map((p) => ({ id: p.id, name: p.name, zoneName: p.zone.name }))}
          preselectedPlaceId={sp.place}
        />
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-zinc-400">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Ничего не публикуется автоматически: каждое предложение проверяет редактор.
      </p>

      {mine.length > 0 && (
        <Section title="Мои предложения" icon={Clock} className="mt-8" bodyClassName="p-0">
          <ul className="divide-y divide-zinc-100">
            {mine.map((s) => {
              const payload = s.payload as { name?: string };
              const st = STATUS[s.status];
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {s.type === "NEW_PLACE" ? payload.name ?? "Новое место" : `Исправление: ${s.targetPlace?.name ?? "место"}`}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(s.createdAt)}</p>
                    {s.editorComment && (
                      <p className="mt-1 text-xs text-zinc-600">Редактор: {s.editorComment}</p>
                    )}
                  </div>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Container>
  );
}

// Страница зависит от сессии/БД: рендерим блокирующе на сервере
export const instant = false;
