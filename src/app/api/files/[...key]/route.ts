import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { asyncRoute } from "@/lib/api";
import { auth } from "@/auth";
import { canReadPhotoKey } from "@/lib/acl";
import { readFileByKey } from "@/lib/storage";

const MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * Выдача файлов по ACL (раздел 14 ТЗ): приватные фото дневника отдаются
 * только тем, кому видна запись. Публичные ключи place/ доступны всем.
 * Прямых постоянных публичных URL у закрытых файлов нет.
 */
export const GET = asyncRoute(
  async (_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) => {
    const { key: parts } = await ctx.params;
    const key = parts.join("/");

    if (!key.startsWith("place/")) {
      const session = await auth();
      const viewerId = session?.user?.id ?? null;
      const allowed = await canReadPhotoKey(key, viewerId);
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Нет доступа к файлу" } },
          { status: 403 },
        );
      }
    }

    const buffer = await readFileByKey(key);
    if (!buffer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Файл не найден" } },
        { status: 404 },
      );
    }
    const dot = key.lastIndexOf(".");
    const mime = MIME_BY_EXT[key.slice(dot).toLowerCase()] ?? "application/octet-stream";
    // Файлы приватные — кэшируем только в памяти браузера.
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(buffer.length),
      },
    });
  },
);
