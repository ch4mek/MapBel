"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import {
  upsertPlaceAction,
  upsertZoneAction,
  upsertEventAction,
  type ActionResult,
} from "@/lib/actions/editor";

const CATEGORIES = [
  ["HISTORIC", "Историческое место"],
  ["MUSEUM", "Музей"],
  ["CASTLE", "Замок / усадьба"],
  ["NATURE", "Природа"],
  ["ECOTRAIL", "Экотропа"],
  ["GASTRO", "Гастрономия"],
  ["UNUSUAL", "Необычное место"],
] as const;

function StateMsg({ state }: { state: ActionResult }) {
  if (state.error)
    return (
      <Alert tone="danger" icon={CircleAlert}>
        {state.error}
      </Alert>
    );
  if (state.ok)
    return (
      <Alert tone="success" icon={CircleCheck}>
        Сохранено.
      </Alert>
    );
  return null;
}

export interface PlaceEditData {
  id: string;
  name: string;
  slug: string;
  zoneId: string;
  category: string;
  description: string;
  lat: number;
  lon: number;
  radiusM: number | null;
  address: string | null;
  openingHours: string | null;
  priceInfo: string | null;
  contacts: string | null;
  officialUrl: string | null;
  accessibility: string | null;
  arrivalTips: string | null;
  isDemo: boolean;
}

export function PlaceForm({
  zones,
  places,
}: {
  zones: { id: string; name: string }[];
  places: PlaceEditData[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    upsertPlaceAction,
    {},
  );
  const [editId, setEditId] = useState("");
  const current = places.find((p) => p.id === editId) ?? null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="edit-place">
          Редактировать существующее
        </label>
        <select
          id="edit-place"
          className="input"
          value={editId}
          onChange={(e) => setEditId(e.target.value)}
        >
          <option value="">— создать новое место —</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {current && <input type="hidden" name="id" value={current.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Название *</label>
          <input name="name" className="input" required defaultValue={current?.name ?? ""} />
        </div>
        <div>
          <label className="label">Slug (латиница) *</label>
          <input name="slug" className="input" required pattern="[a-z0-9-]+" defaultValue={current?.slug ?? ""} />
        </div>
        <div>
          <label className="label">Зона *</label>
          <select name="zoneId" className="input" required defaultValue={current?.zoneId ?? ""}>
            <option value="" disabled>
              Выберите зону
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Категория *</label>
          <select name="category" className="input" required defaultValue={current?.category ?? "HISTORIC"}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Широта *</label>
          <input name="lat" type="number" step="0.000001" className="input" required defaultValue={current?.lat ?? ""} />
        </div>
        <div>
          <label className="label">Долгота *</label>
          <input name="lon" type="number" step="0.000001" className="input" required defaultValue={current?.lon ?? ""} />
        </div>
        <div>
          <label className="label">Радиус, м (пусто = по категории)</label>
          <input name="radiusM" type="number" min={20} max={2000} className="input" defaultValue={current?.radiusM ?? ""} />
        </div>
        <div>
          <label className="label">Адрес</label>
          <input name="address" className="input" defaultValue={current?.address ?? ""} />
        </div>
        <div>
          <label className="label">Время работы</label>
          <input name="openingHours" className="input" defaultValue={current?.openingHours ?? ""} />
        </div>
        <div>
          <label className="label">Стоимость</label>
          <input name="priceInfo" className="input" defaultValue={current?.priceInfo ?? ""} />
        </div>
        <div>
          <label className="label">Контакты</label>
          <input name="contacts" className="input" defaultValue={current?.contacts ?? ""} />
        </div>
        <div>
          <label className="label">Официальный URL</label>
          <input name="officialUrl" type="url" className="input" defaultValue={current?.officialUrl ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Описание *</label>
        <textarea name="description" className="input min-h-24" required defaultValue={current?.description ?? ""} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Доступность</label>
          <input name="accessibility" className="input" defaultValue={current?.accessibility ?? ""} />
        </div>
        <div>
          <label className="label">Советы по приезду</label>
          <input name="arrivalTips" className="input" defaultValue={current?.arrivalTips ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDemo" defaultChecked={current ? current.isDemo : true} className="h-4 w-4" />
        Демо-данные (учебный проект)
      </label>
      <StateMsg state={state} />
      <button className="btn btn-primary w-fit" disabled={pending} type="submit">
        {pending ? "Сохраняем…" : current ? "Обновить место" : "Создать место"}
      </button>
    </form>
  );
}

export function ZoneForm({ zones }: { zones: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    upsertZoneAction,
    {},
  );
  const [editId, setEditId] = useState("");
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label">Редактировать зону</label>
        <select className="input" value={editId} onChange={(e) => setEditId(e.target.value)}>
          <option value="">— создать новую зону —</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>
      {editId && <input type="hidden" name="id" value={editId} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Название *</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Slug *</label>
          <input name="slug" className="input" required pattern="[a-z0-9-]+" />
        </div>
        <div>
          <label className="label">Порог серебра *</label>
          <input name="silverThreshold" type="number" min={1} className="input" required defaultValue={3} />
        </div>
        <div>
          <label className="label">Минимум мест для золота (0 = не доступно)</label>
          <input name="goldMinCount" type="number" min={0} className="input" required defaultValue={5} />
        </div>
        <div>
          <label className="label">Границы: запад (lon) *</label>
          <input name="west" type="number" step="0.001" className="input" required />
        </div>
        <div>
          <label className="label">восток (lon) *</label>
          <input name="east" type="number" step="0.001" className="input" required />
        </div>
        <div>
          <label className="label">юг (lat) *</label>
          <input name="south" type="number" step="0.001" className="input" required />
        </div>
        <div>
          <label className="label">север (lat) *</label>
          <input name="north" type="number" step="0.001" className="input" required />
        </div>
        <div>
          <label className="label">Центр: широта *</label>
          <input name="centerLat" type="number" step="0.000001" className="input" required />
        </div>
        <div>
          <label className="label">долгота *</label>
          <input name="centerLon" type="number" step="0.000001" className="input" required />
        </div>
      </div>
      <div>
        <label className="label">Описание</label>
        <textarea name="description" className="input min-h-16" />
      </div>
      <StateMsg state={state} />
      <button className="btn btn-primary w-fit" disabled={pending} type="submit">
        {pending ? "Сохраняем…" : "Сохранить зону"}
      </button>
    </form>
  );
}

export function EventForm({ places }: { places: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    upsertEventAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Название *</label>
          <input name="title" className="input" required />
        </div>
        <div>
          <label className="label">Статус *</label>
          <select name="status" className="input" defaultValue="SCHEDULED">
            <option value="SCHEDULED">Запланировано</option>
            <option value="CANCELLED">Отменено</option>
            <option value="COMPLETED">Завершено</option>
          </select>
        </div>
        <div>
          <label className="label">Начало *</label>
          <input name="startsAt" type="datetime-local" className="input" required />
        </div>
        <div>
          <label className="label">Окончание *</label>
          <input name="endsAt" type="datetime-local" className="input" required />
        </div>
        <div>
          <label className="label">Место</label>
          <select name="placeId" className="input" defaultValue="">
            <option value="">— без привязки —</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Организатор</label>
          <input name="organizer" className="input" />
        </div>
        <div>
          <label className="label">Официальный URL</label>
          <input name="officialUrl" type="url" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Описание</label>
        <textarea name="description" className="input min-h-16" />
      </div>
      <StateMsg state={state} />
      <button className="btn btn-primary w-fit" disabled={pending} type="submit">
        {pending ? "Сохраняем…" : "Сохранить событие"}
      </button>
    </form>
  );
}
