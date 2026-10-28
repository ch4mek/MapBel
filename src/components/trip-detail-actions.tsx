"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, CircleAlert, LogOut, Play, Plus, Trash2, UserPlus, X } from "lucide-react";
import {
  startTripAction,
  cancelTripAction,
  leaveTripAction,
  addTripPlaceAction,
  removeTripPlaceAction,
  inviteToTripAction,
  respondTripInviteAction,
  type ActionResult,
} from "@/lib/actions/social";
import { Alert } from "@/components/ui/primitives";

function useTripAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        onOk?.();
        router.refresh();
      }
    });
  }
  return { error, pending, run };
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert tone="danger" icon={CircleAlert} className="mt-3">
      {error}
    </Alert>
  );
}

export function TripOrganizerActions({ tripId, canStart }: { tripId: string; canStart: boolean }) {
  const { error, pending, run } = useTripAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || !canStart}
          onClick={() => run(() => startTripAction(tripId))}
        >
          <Play className="size-4" />
          Начать поездку
        </button>
        {!canStart && (
          <p className="hint -mt-1 text-center">Добавьте в маршрут хотя бы одно место</p>
        )}
        {confirmCancel ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm flex-1"
              disabled={pending}
              onClick={() => run(() => cancelTripAction(tripId))}
            >
              Отменить поездку
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmCancel(false)}>
              Нет
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-subtle btn-sm" onClick={() => setConfirmCancel(true)}>
            <Ban className="size-4" />
            Отменить поездку
          </button>
        )}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function TripInviteForm({
  tripId,
  friends,
}: {
  tripId: string;
  friends: { username: string; displayName: string }[];
}) {
  const { error, pending, run } = useTripAction();
  const [username, setUsername] = useState("");

  if (friends.length === 0) {
    return (
      <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">
        Все ваши друзья уже приглашены — или добавьте новых в разделе «Друзья».
      </p>
    );
  }
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!username) return;
          const fd = new FormData();
          fd.set("tripId", tripId);
          fd.set("username", username);
          run(() => inviteToTripAction({}, fd), () => setUsername(""));
        }}
      >
        <select
          className="input h-10"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label="Кого пригласить"
        >
          <option value="">Выберите друга</option>
          {friends.map((f) => (
            <option key={f.username} value={f.username}>
              {f.displayName}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary h-10 shrink-0" disabled={pending || !username}>
          <UserPlus className="size-4" />
          <span className="sr-only sm:not-sr-only">Пригласить</span>
        </button>
      </form>
      <ErrorLine error={error} />
    </div>
  );
}

export function TripInviteRespond({ tripId }: { tripId: string }) {
  const { error, pending, run } = useTripAction();
  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={pending}
          onClick={() => run(() => respondTripInviteAction(tripId, true))}
        >
          <Check className="size-4" />
          Принять
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => run(() => respondTripInviteAction(tripId, false))}
        >
          <X className="size-4" />
          Отказаться
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const { error, pending, run } = useTripAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      {confirm ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-danger btn-sm flex-1"
            disabled={pending}
            onClick={() => run(() => leaveTripAction(tripId))}
          >
            Выйти
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(false)}>
            Остаться
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-subtle btn-sm w-full" onClick={() => setConfirm(true)}>
          <LogOut className="size-4" />
          Выйти из поездки
        </button>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

export function TripRouteEditor({
  tripId,
  allPlaces,
}: {
  tripId: string;
  allPlaces: { id: string; name: string; zoneName: string }[];
}) {
  const { error, pending, run } = useTripAction();
  const [placeId, setPlaceId] = useState("");

  const byZone = new Map<string, { id: string; name: string }[]>();
  for (const p of allPlaces) {
    const list = byZone.get(p.zoneName) ?? [];
    list.push(p);
    byZone.set(p.zoneName, list);
  }

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!placeId) return;
          run(() => addTripPlaceAction(tripId, placeId), () => setPlaceId(""));
        }}
      >
        <select
          className="input h-10"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          aria-label="Добавить место в маршрут"
        >
          <option value="">Добавить место в маршрут…</option>
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
        <button type="submit" className="btn btn-secondary h-10 shrink-0" disabled={pending || !placeId}>
          <Plus className="size-4" />
          <span className="sr-only sm:not-sr-only">Добавить</span>
        </button>
      </form>
      <ErrorLine error={error} />
    </div>
  );
}

export function TripPlaceRemove({ tripId, placeId }: { tripId: string; placeId: string }) {
  const { pending, run } = useTripAction();
  return (
    <button
      type="button"
      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
      disabled={pending}
      onClick={() => run(() => removeTripPlaceAction(tripId, placeId))}
      aria-label="Убрать место из маршрута"
      title="Убрать из маршрута"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
