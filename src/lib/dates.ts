import { APP_TZ_OFFSET_MINUTES } from "@/config/game";

const OFFSET_MS = APP_TZ_OFFSET_MINUTES * 60 * 1000;

/**
 * Сдвигает момент времени в «настенное» время Europe/Minsk.
 * Minsk — фиксированный UTC+3, поэтому арифметика простая.
 */
export function toMinskWallClock(t: Date | number): Date {
  const ms = typeof t === "number" ? t : t.getTime();
  return new Date(ms + OFFSET_MS);
}

/** Ключ календарного дня в Minsk: "YYYY-MM-DD". */
export function minskDayKey(t: Date | number): string {
  return toMinskWallClock(t).toISOString().slice(0, 10);
}

/** Ключ сегодняшнего дня в Minsk. */
export function minskTodayKey(): string {
  return minskDayKey(Date.now());
}

/** Ключ календарного месяца в Minsk: "YYYY-MM". */
export function minskMonthKey(t: Date | number): string {
  return toMinskWallClock(t).toISOString().slice(0, 7);
}

/** Начало календарного дня в Minsk как момент UTC. */
export function minskDayStart(t: Date | number): Date {
  const wall = toMinskWallClock(t);
  const dayStartUtcMs = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
  );
  return new Date(dayStartUtcMs - OFFSET_MS);
}

/**
 * Границы календарного месяца в Minsk как моменты UTC [start, end).
 * Используется для месячного рейтинга (раздел 10 ТЗ).
 */
export function minskMonthRange(t: Date | number): { start: Date; end: Date } {
  const wall = toMinskWallClock(t);
  const startUtcMs = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), 1);
  const endUtcMs = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + 1, 1);
  return { start: new Date(startUtcMs - OFFSET_MS), end: new Date(endUtcMs - OFFSET_MS) };
}
