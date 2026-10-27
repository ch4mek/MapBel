// Обработка загружаемых фотографий (раздел 8 ТЗ):
// проверка сигнатуры (не только расширения), лимит размера,
// оптимизированные превью, удаление EXIF (sharp убирает метаданные
// по умолчанию при записи производных файлов).

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PHOTO_LIMITS } from "@/config/game";
import { saveFile } from "@/lib/storage";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/** Определяем реальный тип по магическим байтам. */
export function sniffImageType(buffer: Buffer): ImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export interface ProcessedPhoto {
  fullKey: string;
  previewKey: string;
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
}

export type ProcessPhotoError = "TOO_LARGE" | "UNSUPPORTED_TYPE" | "CORRUPT_IMAGE";

export function checkUploadSize(byteLength: number): ProcessPhotoError | null {
  if (byteLength > PHOTO_LIMITS.maxUploadBytes) return "TOO_LARGE";
  return null;
}

/**
 * Полный конвейер: валидация → auto-поворот по EXIF → полная версия
 * (до maxEdgeFull) и превью (до maxEdgePreview) в WebP без EXIF.
 */
export async function processPhotoUpload(buffer: Buffer): Promise<
  { ok: true; photo: ProcessedPhoto } | { ok: false; error: ProcessPhotoError }
> {
  const sizeError = checkUploadSize(buffer.byteLength);
  if (sizeError) return { ok: false, error: sizeError };
  const mime = sniffImageType(buffer);
  if (!mime) return { ok: false, error: "UNSUPPORTED_TYPE" };

  try {
    const rotated = sharp(buffer).rotate();
    const meta = await rotated.metadata();
    if (!meta.width || !meta.height) return { ok: false, error: "CORRUPT_IMAGE" };

    const id = randomUUID();
    const full = await rotated
      .clone()
      .resize({
        width: meta.width > meta.height ? PHOTO_LIMITS.maxEdgeFull : undefined,
        height: meta.height >= meta.width ? PHOTO_LIMITS.maxEdgeFull : undefined,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_LIMITS.webpQuality })
      .toBuffer({ resolveWithObject: true });
    const preview = await rotated
      .clone()
      .resize({
        width: meta.width > meta.height ? PHOTO_LIMITS.maxEdgePreview : undefined,
        height: meta.height >= meta.width ? PHOTO_LIMITS.maxEdgePreview : undefined,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_LIMITS.webpQuality })
      .toBuffer({ resolveWithObject: true });

    const fullKey = `diary/${id}.webp`;
    const previewKey = `diary-preview/${id}.webp`;
    await saveFile(fullKey, full.data);
    await saveFile(previewKey, preview.data);

    return {
      ok: true,
      photo: {
        fullKey,
        previewKey,
        width: full.info.width,
        height: full.info.height,
        previewWidth: preview.info.width,
        previewHeight: preview.info.height,
      },
    };
  } catch {
    return { ok: false, error: "CORRUPT_IMAGE" };
  }
}

export const PHOTO_ERROR_MESSAGES: Record<ProcessPhotoError, string> = {
  TOO_LARGE: `Файл больше ${Math.round(PHOTO_LIMITS.maxUploadBytes / (1024 * 1024))} МБ`,
  UNSUPPORTED_TYPE: "Поддерживаются только JPEG, PNG и WebP",
  CORRUPT_IMAGE: "Не удалось обработать изображение",
};
