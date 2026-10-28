"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CircleAlert,
  FlaskConical,
  Handshake,
  LocateFixed,
  PartyPopper,
  RotateCcw,
  Trophy,
  Zap,
} from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

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

const RANK_RU: Record<string, string> = { BRONZE: "Бронза", SILVER: "Серебро", GOLD: "Золото" };

type Phase = "idle" | "locating" | "sending" | "done" | "error";

export function CheckinButton({
  placeId,
  authorized,
  demoEnabled,
  visitedToday,
  tripId,
  compact = false,
}: {
  placeId: string;
  authorized: boolean;
  demoEnabled: boolean;
  visitedToday: boolean;
  tripId?: string;
  compact?: boolean;
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
        setMessage(data?.error?.message ?? "Не удалось подтвердить посещение");
        return;
      }
      setResult(data as CheckinResponse);
      setPhase("done");
      router.refresh();
    } catch {
      setPhase("error");
      setMessage("Нет подключения к интернету. Проверьте сеть и попробуйте снова");
    }
  }

  function locateAndCheckin() {
    if (!("geolocation" in navigator)) {
      setPhase("error");
      setMessage("Этот браузер не поддерживает геолокацию");
      return;
    }
    if (!navigator.onLine) {
      setPhase("error");
      setMessage("Нет подключения к интернету. Подтверждение возможно только онлайн");
      return;
    }
    setPhase("locating");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void sendCheckin({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          positionTimestamp: pos.timestamp,
        }),
      (err) => {
        setPhase("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Доступ к геолокации запрещён. Разрешите его в настройках браузера — без этого подтверждение невозможно"
            : err.code === err.TIMEOUT
              ? "Не удалось получить позицию вовремя. Выйдите на открытое место и повторите"
              : "Геолокация на устройстве сейчас недоступна",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function demoCheckin() {
    setPhase("locating");
    setMessage(null);
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
      setMessage("Нет подключения к интернету");
    }
  }

  if (!authorized) {
    return (
      <div className="rounded-2xl bg-forest-50 p-4 text-sm text-forest-900">
        <p className="font-semibold">Хотите открыть эту зону?</p>
        <p className="mt-1 text-forest-800/80">Войдите, чтобы подтверждать посещения и получать награды.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/login" className="btn btn-primary btn-sm">Войти</Link>
          <Link href="/register" className="btn btn-secondary btn-sm">Регистрация</Link>
        </div>
      </div>
    );
  }

  const busy = phase === "locating" || phase === "sending";

  if (phase === "done" && result) {
    return (
      <div className="animate-pop overflow-hidden rounded-2xl bg-gradient-to-br from-forest-600 to-forest-900 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
            {result.repeatVisit ? <RotateCcw className="size-6" /> : <PartyPopper className="size-6" />}
          </span>
          <div>
            <p className="font-display text-lg font-bold">
              {result.repeatVisit ? "Уже учтено" : "Визит подтверждён!"}
            </p>
            <p className="text-sm text-white/75">
              {result.repeatVisit
                ? "Повторные отметки не дают очков"
                : `Вы в ${Math.round(result.distanceM)} м от объекта`}
            </p>
          </div>
        </div>
        {(result.xpGained > 0 || result.newlyReachedRanks.length > 0 || result.achievementsAwarded.length > 0) && (
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {result.xpGained > 0 && (
              <li className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <Zap className="size-4 text-gold-500" /> +{result.xpGained} XP
              </li>
            )}
            {result.newlyReachedRanks.length > 0 && (
              <li className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <Trophy className="size-4 text-gold-500" />
                Ранг зоны: {result.newlyReachedRanks.map((r) => RANK_RU[r]).join(" → ")}
              </li>
            )}
            {result.achievementsAwarded.map((a) => (
              <li key={a} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <Trophy className="size-4 text-gold-500" />
                Достижение «{ACHIEVEMENT_NAMES[a] ?? a}»
              </li>
            ))}
          </ul>
        )}
        {tripId && (
          <p className="mt-3 flex items-center gap-2 text-sm text-white/85">
            <Handshake className="size-4 shrink-0" />
            {result.jointVisitConfirmed
              ? "Совместная отметка засчитана!"
              : "Ждём подтверждения второго участника (до 2 часов)"}
          </p>
        )}
        <Link
          href={`/diary/new?place=${placeId}${tripId ? `&trip=${tripId}` : ""}`}
          className="btn btn-sm mt-4 bg-white text-forest-800 hover:bg-forest-50"
        >
          <BookOpen className="size-4" />
          Записать впечатления
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={locateAndCheckin}
        disabled={busy}
        className={cn(
          "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-forest-500 to-forest-800 font-display font-bold text-white shadow-lg shadow-forest-900/25 transition hover:shadow-xl hover:shadow-forest-900/30 active:scale-[0.99] disabled:opacity-80",
          compact ? "h-12 text-sm" : "h-14 text-base",
        )}
      >
        {busy ? (
          <>
            <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            {phase === "locating" ? "Определяем позицию…" : "Проверяем на сервере…"}
          </>
        ) : (
          <>
            <LocateFixed className="size-5 transition group-hover:scale-110" />
            Я здесь
          </>
        )}
      </button>

      {demoEnabled && (
        <button
          type="button"
          onClick={() => void demoCheckin()}
          disabled={busy}
          className="btn btn-sm border border-dashed border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          title="Только для локальной разработки"
        >
          <FlaskConical className="size-3.5" />
          Демо-позиция (только dev)
        </button>
      )}

      {phase === "error" && message && (
        <Alert tone="danger" icon={CircleAlert}>
          {message}
          <button
            type="button"
            onClick={locateAndCheckin}
            className="mt-2 flex items-center gap-1 text-xs font-bold underline-offset-2 hover:underline"
          >
            <RotateCcw className="size-3" /> Попробовать снова
          </button>
        </Alert>
      )}

      {!compact && phase !== "error" && (
        <p className="text-xs leading-relaxed text-zinc-500">
          {visitedToday
            ? "Сегодня место уже отмечено — повторная отметка завтра и без очков."
            : "Нужна свежая геопозиция с точностью до 100 м. Координаты проверяются на сервере и не публикуются."}
        </p>
      )}
    </div>
  );
}
