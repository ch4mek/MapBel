"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

function useTripAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }
  return { error, pending, run };
}

export function TripOrganizerActions({ tripId }: { tripId: string }) {
  const { error, pending, run } = useTripAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => run(() => startTripAction(tripId))}
      >
        ▶ Стартовать поездку
      </button>
      {confirmCancel ? (
        <>
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending}
            onClick={() => run(() => cancelTripAction(tripId))}
          >
            Подтвердить отмену
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>
            Не отменять
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(true)}>
          ✖ Отменить поездку
        </button>
      )}
      {error && (
        <p className="w-full text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TripInviteForm({ tripId }: { tripId: string }) {
  const { error, pending, run } = useTripAction();
  const [username, setUsername] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("tripId", tripId);
        fd.set("username", username);
        run(() => inviteToTripAction({}, fd));
      }}
    >
      {/* inviteToTripAction — action-функция (prev, formData); вызываем напрямую */}
      <input
        className="input"
        placeholder="username друга"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        aria-label="Имя пользователя для приглашения"
      />
      <button type="submit" className="btn btn-ghost" disabled={pending}>
        Пригласить
      </button>
      {error && (
        <p className="w-full text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function TripInviteRespond({ tripId }: { tripId: string }) {
  const { pending, run } = useTripAction();
  return (
    <span className="flex gap-1.5">
      <button
        type="button"
        className="btn btn-primary !min-h-0 !px-2 !py-1 text-xs"
        disabled={pending}
        onClick={() => run(() => respondTripInviteAction(tripId, true))}
      >
        ✔ Принять
      </button>
      <button
        type="button"
        className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
        disabled={pending}
        onClick={() => run(() => respondTripInviteAction(tripId, false))}
      >
        ✖ Отклонить
      </button>
    </span>
  );
}

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const { pending, run } = useTripAction();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      onClick={() => run(() => leaveTripAction(tripId))}
    >
      Выйти из поездки
    </button>
  );
}

export function TripRouteEditor({
  tripId,
  allPlaces,
}: {
  tripId: string;
  allPlaces: { id: string; name: string }[];
}) {
  const { error, pending, run } = useTripAction();
  const [placeId, setPlaceId] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!placeId) return;
          run(() => addTripPlaceAction(tripId, placeId));
          setPlaceId("");
        }}
      >
        <select
          className="input"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          aria-label="Добавить место в маршрут"
        >
          <option value="">Выберите место…</option>
          {allPlaces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost" disabled={pending || !placeId}>
          ➕ Добавить
        </button>
      </form>
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TripPlaceRemove({
  tripId,
  placeId,
}: {
  tripId: string;
  placeId: string;
}) {
  const { pending, run } = useTripAction();
  return (
    <button
      type="button"
      className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
      disabled={pending}
      onClick={() => run(() => removeTripPlaceAction(tripId, placeId))}
      aria-label="Убрать место из маршрута"
    >
      🗑
    </button>
  );
}
