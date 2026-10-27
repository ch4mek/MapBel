import { GEO_LIMITS } from "@/config/game";

export interface LatLng {
  lat: number;
  lon: number;
}

export interface GeoPositionInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  positionTimestamp: number; // epoch ms, момент снятия позиции
}

/**
 * Расстояние по большому кругу (Haversine), метры.
 * Используем средний радиус Земли 6371008.8 м (IUGG mean radius).
 */
export function haversineDistanceM(a: LatLng, b: LatLng): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type PositionValidationError =
  | "NOT_A_NUMBER"
  | "OUT_OF_RANGE"
  | "NEGATIVE_ACCURACY"
  | "ACCURACY_TOO_LOW"
  | "POSITION_IN_FUTURE"
  | "POSITION_TOO_OLD";

export interface ValidatePositionOptions {
  /** Возраст проверяется относительно этого момента (серверное now). */
  now: number;
}

/**
 * Валидация позиции клиента (раздел 7 ТЗ): отклонять нечисловые и
 * невозможные координаты, отрицательную точность, точность > лимита,
 * заметно будущие timestamps и устаревшие позиции.
 */
export function validatePosition(
  input: GeoPositionInput,
  opts: ValidatePositionOptions,
): PositionValidationError | null {
  const { latitude, longitude, accuracy, positionTimestamp } = input;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    !Number.isFinite(positionTimestamp)
  ) {
    return "NOT_A_NUMBER";
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return "OUT_OF_RANGE";
  }
  if (accuracy < 0) return "NEGATIVE_ACCURACY";
  if (accuracy > GEO_LIMITS.maxAccuracyM) return "ACCURACY_TOO_LOW";
  const ageMs = opts.now - positionTimestamp;
  if (ageMs < -GEO_LIMITS.maxFutureSkewSec * 1000) return "POSITION_IN_FUTURE";
  if (ageMs > GEO_LIMITS.maxPositionAgeSec * 1000) return "POSITION_TOO_OLD";
  return null;
}

/** Внутри ли радиуса с допуском на точность (расстояние + accuracy). */
export function isWithinRadius(
  position: LatLng,
  target: LatLng,
  radiusM: number,
  accuracyM: number,
): boolean {
  const distance = haversineDistanceM(position, target);
  // Требование AC03/AC04: далеко — не засчитано. Точность добавляем к
  // пройденному расстоянию, чтобы честно учитывать шум GPS.
  return distance - accuracyM <= radiusM;
}
