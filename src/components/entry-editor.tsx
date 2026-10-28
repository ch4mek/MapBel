"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, EyeOff, Globe, Users, type LucideIcon } from "lucide-react";
import {
  createDiaryEntryAction,
  updateDiaryEntryAction,
  type ActionResult,
} from "@/lib/actions/diary";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export interface EntryEditorProps {
  mode: "create" | "edit";
  places: { id: string; name: string; zoneName: string }[];
  trips: { id: string; title: string }[];
  entry?: {
    id: string;
    title: string;
    placeId: string;
    tripDate: string | null;
    description: string | null;
    visibility: string;
  };
  preselectedPlaceId?: string;
  preselectedTripId?: string;
}

const VISIBILITY: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "PRIVATE", label: "Только мне", hint: "Никто, кроме вас", icon: EyeOff },
  { value: "FRIENDS", label: "Друзьям", hint: "По умолчанию", icon: Users },
  { value: "PUBLIC", label: "Всем", hint: "Любой посетитель", icon: Globe },
];

export function EntryEditor(props: EntryEditorProps) {
  const router = useRouter();
  const action = props.mode === "create" ? createDiaryEntryAction : updateDiaryEntryAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.ok && state.id && props.mode === "create") router.push(`/diary/${state.id}`);
    if (state.ok && props.mode === "edit") router.refresh();
  }, [state, router, props.mode]);

  // Группировка мест по зонам для удобного выбора
  const byZone = new Map<string, { id: string; name: string }[]>();
  for (const p of props.places) {
    const list = byZone.get(p.zoneName) ?? [];
    list.push({ id: p.id, name: p.name });
    byZone.set(p.zoneName, list);
  }

  const currentVisibility = props.entry?.visibility ?? "FRIENDS";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {props.mode === "edit" && <input type="hidden" name="id" value={props.entry?.id} />}
      <div>
        <label className="label" htmlFor="title">
          Заголовок
        </label>
        <input
          id="title"
          name="title"
          className="input h-12 text-base"
          required
          maxLength={120}
          defaultValue={props.entry?.title ?? ""}
          placeholder="Например: Рассвет у Мирского замка"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="placeId">
            Место
          </label>
          <select
            id="placeId"
            name="placeId"
            className="input"
            required
            defaultValue={props.entry?.placeId ?? props.preselectedPlaceId ?? ""}
          >
            <option value="" disabled>
              Выберите место
            </option>
            {[...byZone.entries()].map(([zone, list]) => (
              <optgroup key={zone} label={zone}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tripDate">
            Дата поездки
          </label>
          <input
            id="tripDate"
            name="tripDate"
            type="date"
            className="input"
            defaultValue={props.entry?.tripDate ?? ""}
          />
          <p className="hint">Можно указать прошлую — зоны задним числом не открываются.</p>
        </div>
      </div>

      {props.mode === "create" && props.trips.length > 0 && (
        <div>
          <label className="label" htmlFor="tripId">
            Совместная поездка
          </label>
          <select id="tripId" name="tripId" className="input" defaultValue={props.preselectedTripId ?? ""}>
            <option value="">Без поездки</option>
            {props.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <p className="hint">Запись появится в карточке поездки для её участников.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="description">
          Рассказ
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-36"
          maxLength={10000}
          defaultValue={props.entry?.description ?? ""}
          placeholder="Как прошёл день? Что запомнилось больше всего?"
        />
      </div>

      <fieldset>
        <legend className="label">Кто видит запись</legend>
        <div className="grid grid-cols-3 gap-2">
          {VISIBILITY.map((v) => (
            <label key={v.value} className="cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={v.value}
                defaultChecked={currentVisibility === v.value}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-full flex-col items-center gap-1 rounded-2xl border-2 border-zinc-200 bg-white p-3 text-center transition",
                  "peer-checked:border-forest-600 peer-checked:bg-forest-50 peer-focus-visible:ring-4 peer-focus-visible:ring-forest-500/25 hover:border-zinc-300",
                )}
              >
                <v.icon className="size-5 text-forest-700" aria-hidden />
                <span className="text-sm font-semibold text-zinc-900">{v.label}</span>
                <span className="text-[11px] leading-tight text-zinc-500">{v.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      {state.ok && props.mode === "edit" && (
        <Alert tone="success" icon={CircleCheck}>
          Изменения сохранены
        </Alert>
      )}
      <button className="btn btn-primary btn-lg self-start" type="submit" disabled={pending}>
        {pending
          ? "Сохраняем…"
          : props.mode === "create"
            ? "Создать и добавить фото"
            : "Сохранить изменения"}
      </button>
    </form>
  );
}
