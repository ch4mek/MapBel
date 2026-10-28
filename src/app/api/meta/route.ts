import { NextResponse } from "next/server";

/**
 * Возможности сервера для клиента. Демо-симуляция геопозиции включается
 * ТОЛЬКО комбинацией серверных флагов (NODE_ENV != production и
 * DEMO_GEO_ENABLED=true) — обычный клиентский флаг ею не управляет (AC18).
 */
export function GET() {
  const demoGeoEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.DEMO_GEO_ENABLED === "true";
  return NextResponse.json({
    demoGeoEnabled,
    mapStyleUrl:
      process.env.MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron",
  });
}
