// Хранилище файлов: локальный диск для разработки (без Docker/MinIO),
// S3-совместимый драйвер подключается позже тем же интерфейсом (см. README).

import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const FILES_DIR = process.env.FILES_DIR
  ? path.resolve(process.env.FILES_DIR)
  : path.resolve(process.cwd(), "data", "files");

/** Ключи файлов: "diary/<uuid>.webp" и т.п. Путь жёстко ограничен каталогом. */
export function resolveKey(key: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(key) || key.includes("..")) {
    throw new Error("Недопустимый ключ файла");
  }
  const full = path.join(FILES_DIR, key);
  if (!full.startsWith(FILES_DIR + path.sep)) {
    throw new Error("Недопустимый ключ файла");
  }
  return full;
}

export async function saveFile(key: string, data: Buffer): Promise<void> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readFileByKey(key: string): Promise<Buffer | null> {
  const full = resolveKey(key);
  if (!existsSync(full)) return null;
  return readFile(full);
}

export function fileStreamPath(key: string): string {
  return resolveKey(key);
}

export async function deleteFile(key: string): Promise<void> {
  const full = resolveKey(key);
  if (existsSync(full)) await unlink(full);
}

export { createReadStream };
