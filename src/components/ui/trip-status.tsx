import { Ban, CalendarClock, CircleCheck, Play } from "lucide-react";
import { Pill } from "@/components/ui/primitives";

const STATUS = {
  PLANNED: { label: "Запланирована", tone: "info", icon: CalendarClock },
  ACTIVE: { label: "В пути", tone: "success", icon: Play },
  COMPLETED: { label: "Завершена", tone: "warning", icon: CircleCheck },
  CANCELLED: { label: "Отменена", tone: "danger", icon: Ban },
} as const;

export type TripStatusKey = keyof typeof STATUS;

export function TripStatusPill({ status }: { status: TripStatusKey }) {
  const s = STATUS[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {s.label}
    </Pill>
  );
}
