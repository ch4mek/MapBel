"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  createDiaryEntryAction,
  updateDiaryEntryAction,
  type ActionResult,
} from "@/lib/actions/diary";

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
}

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Только мне" },
  { value: "FRIENDS", label: "Друзьям (по умолчанию)" },
  { value: "PUBLIC", label: "Всем" },
];

export function EntryEditor(props: EntryEditorProps) {
  const router = useRouter();
  const action = props.mode === "create" ? createDiaryEntryAction : updateDiaryEntryAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/diary/${state.id}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4">
      {props.mode === "edit" && <input type="hidden" name="id" value={props.entry?.id} />}
      <div>
        <label className="label" htmlFor="title">
          Заголовок *
        </label>
        <input
          id="title"
          name="title"
          className="input"
          required
          maxLength={120}
          defaultValue={props.entry?.title ?? ""}
          placeholder="Первый раз в Мирском замке"
        />
      </div>
      <div>
        <label className="label" htmlFor="placeId">
          Место *
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
          {props.places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.zoneName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="tripDate">
          Дата поездки (можно прошлую — задним числом зоны не открываются)
        </label>
        <input
          id="tripDate"
          name="tripDate"
          type="date"
          className="input"
          defaultValue={props.entry?.tripDate ?? ""}
        />
      </div>
      {props.mode === "create" && (
        <div>
          <label className="label" htmlFor="tripId">
            Совместная поездка (необязательно)
          </label>
          <select id="tripId" name="tripId" className="input" defaultValue="">
            <option value="">— нет —</option>
            {props.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="description">
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-28"
          maxLength={10000}
          defaultValue={props.entry?.description ?? ""}
          placeholder="Как всё прошло?"
        />
      </div>
      <div>
        <label className="label" htmlFor="visibility">
          Кто видит запись
        </label>
        <select
          id="visibility"
          name="visibility"
          className="input"
          defaultValue={props.entry?.visibility ?? "FRIENDS"}
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {state.error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        {pending
          ? "Сохраняем…"
          : props.mode === "create"
            ? "Создать запись → добавить фото"
            : "Сохранить"}
      </button>
    </form>
  );
}
