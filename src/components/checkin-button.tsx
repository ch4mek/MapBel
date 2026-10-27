"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CheckinResponse {
  visitId: string;
  xpGained: number;
  repeatVisit: boolean;
  rank: string;
  newlyReachedRanks: string[];
  achievementsAwarded: string[];
  distanceM: number;
  jointVisitConfirmed?: boolean;
}

const ACHIEVEMENT_NAMES: Record<string, string> = {
  first_step: "Первый шаг",
  beyond_usual: "За пределами привычного",
  belarus_explorer: "Исследователь Беларуси",
  territory_master: "Знаток территории",
  history_tracks: "По следам истории",
  castle_route: "Замковый маршрут",
  closer_to_nature: "Ближе к природе",
  taste_of_travel: "Вкус путешествия",
  better_together: "Вместе интереснее",
  team_adventure: "Командное приключение",
};

const RANK_RU: Record<string, string> = {
  BRONZE: "Бронза",
  SILVER: "Серебро",
  GOLD: "Золото",
};

type Phase = "idle" | "locating" | "sending" | "done" | "error";

export function CheckinButton({
  placeId,
  authorized,
  demoEnabled,
  visitedToday,
  tripId,
}: {
  placeId: string;
  authorized: boolean;
  demoEnabled: boolean;
  visitedToday: boolean;
  tripId?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResponse | null>(null);

  async function sendCheckin(position: {
    latitude: number;
    longitude: number;
    accuracy: number;
    positionTimestamp: number;
  }) {
    setPhase("sending");
    setMessage("Проверяем позицию на сервере…");
    try {
      const res = await fetch(`/api/places/${placeId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...position,
          idempotencyKey: crypto.randomUUID(),
          ...(tripId ? { tripId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase("error");
        setMessage(
          data?.error?.message ?? "Не удалось подтвердить посещение. Попробуйте ещё раз",
        );
        return;
      }
      setResult(data as CheckinResponse);
      setPhase("done");
      router.refresh();
    } catch {
      setPhase("error");
      setMessage("Нет сети. Проверьте подключение и попробуйте ещё раз");
    }
  }

  function locateAndCheckin() {
    if (!authorized) {
      setMessage("Войдите, чтобы подтверждать посещения");
      setPhase("error");
      return;
    }
    if (!("geolocation" in navigator)) {
      setPhase("error");
      setMessage("Геолокация недоступна в этом браузере");
      return;
    }
    setPhase("locating");
    setMessage("Запрашиваем геолокацию… Разрешите доступ в браузере");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void sendCheckin({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          positionTimestamp: pos.timestamp,
        });
      },
      (err) => {
        setPhase("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Доступ к геолокации отклонён. Без разрешения подтверждение невозможно — разрешите доступ и повторите"
            : err.code === err.TIMEOUT
              ? "Не удалось получить позицию (тайм-аут). Выйдите на открытое место и повторите"
              : "Геолокация недоступна на этом устройстве",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function demoCheckin() {
    setPhase("locating");
    setMessage("Получаем демо-позицию места…");
    try {
      const res = await fetch("/api/demo/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase("error");
        setMessage(data?.error?.message ?? "Демо-режим недоступен");
        return;
      }
      await sendCheckin(data);
    } catch {
      setPhase("error");
      setMessage("Нет сети");
    }
  }

  const busy = phase === "locating" || phase === "sending";

  return (
    <div className="card p-4">
      <h2 className="text-base font-semibold">Подтверждение посещения</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Нужна свежая геопозиция (точность ≤100 м). Проверка выполняется на
        сервере: расстояние до объекта, точность и возраст позиции.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn btn-primary"
          type="button"
          onClick={locateAndCheckin}
          disabled={busy}
        >
          📍 Я здесь
        </button>
        {demoEnabled && (
          <button
            className="btn btn-ghost !border-amber-400 !text-amber-800"
            type="button"
            onClick={() => void demoCheckin()}
            disabled={busy}
            title="Только для локальной разработки"
          >
            🧪 Демо-позиция (dev)
          </button>
        )}
      </div>

      {message && (
        <p
          className={`mt-3 text-sm ${phase === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
          role="status"
        >
          {message}
        </p>
      )}

      {phase === "done" && result && (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">
          {result.repeatVisit ? (
            <p>✔ Посещение уже учтено ранее (повторы не дают очков).</p>
          ) : (
            <p>
              ✅ Визит подтверждён! Расстояние до объекта:{" "}
              {Math.round(result.distanceM)} м.
            </p>
          )}
          {tripId && (
            <p>
              {result.jointVisitConfirmed
                ? "🤝 Подтверждение учтено в совместной поездке."
                : "Подтверждение отправлено в поездку — ждём второго участника (окно 2 часа)."}
            </p>
          )}
          {result.xpGained > 0 && <p>Начислено XP: +{result.xpGained}</p>}
          {result.newlyReachedRanks.length > 0 && (
            <p>
              Новые ранги зоны:{" "}
              {result.newlyReachedRanks.map((r) => RANK_RU[r]).join(" → ")} 🎉
            </p>
          )}
          {result.achievementsAwarded.length > 0 && (
            <p>
              Новые достижения:{" "}
              {result.achievementsAwarded
                .map((a) => ACHIEVEMENT_NAMES[a] ?? a)
                .join(", ")}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <a href={`/diary/new?place=${placeId}`} className="btn btn-ghost !min-h-0">
              📖 Добавить в дневник
            </a>
          </div>
        </div>
      )}

      {visitedToday && phase !== "done" && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Сегодня это место уже отмечено — повторная отметка возможна завтра
          (повторные визиты не дают очков).
        </p>
      )}
    </div>
  );
}
