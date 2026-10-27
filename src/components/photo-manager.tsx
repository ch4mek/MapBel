"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TagActions } from "@/components/tag-actions";

export interface PhotoItem {
  id: string;
  previewKey: string;
  storageKey: string;
  caption: string | null;
  width: number;
  height: number;
  tags: {
    id: string;
    status: string;
    taggedUser: { displayName: string; username: string };
  }[];
}

export function PhotoManager({
  entryId,
  photos,
  maxPhotos,
  isAuthor,
}: {
  entryId: string;
  photos: PhotoItem[];
  maxPhotos: number;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagUsername, setTagUsername] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch(`/api/diary/${entryId}/photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось загрузить фото");
      } else {
        router.refresh();
      }
    } catch {
      setError("Нет сети при загрузке");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto(photoId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Не удалось удалить фото");
        return;
      }
      router.refresh();
    });
  }

  function saveCaption(photoId: string, caption: string) {
    startTransition(async () => {
      await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      router.refresh();
    });
  }

  function createTag(photoId: string) {
    const username = (tagUsername[photoId] ?? "").trim();
    if (!username) return;
    startTransition(async () => {
      const res = await fetch(`/api/photos/${photoId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось отметить друга");
        return;
      }
      setTagUsername((s) => ({ ...s, [photoId]: "" }));
      router.refresh();
    });
  }

  return (
    <section className="card p-4">
      <h2 className="text-base font-semibold">
        Фотографии ({photos.length}/{maxPhotos})
      </h2>

      {photos.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Фото пока нет. {isAuthor ? "Загрузите первое — JPEG/PNG/WebP до 10 МБ." : ""}
        </p>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((p) => (
          <li key={p.id} className="rounded-lg border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${p.previewKey}`}
              alt={p.caption ?? ""}
              className="max-h-56 w-full rounded object-cover"
              width={p.width}
              height={p.height}
            />
            {isAuthor ? (
              <>
                <div className="mt-2 flex gap-1.5">
                  <input
                    className="input !min-h-0 !py-1.5 text-xs"
                    placeholder="Подпись к фото"
                    defaultValue={p.caption ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (p.caption ?? "")) {
                        saveCaption(p.id, e.target.value);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
                    disabled={pending}
                    onClick={() => removePhoto(p.id)}
                    aria-label={`Удалить фото ${p.caption ?? ""}`}
                  >
                    🗑
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs text-[var(--muted)]">
                    Отметки:{" "}
                    {p.tags.length === 0
                      ? "нет"
                      : p.tags
                          .map(
                            (t) =>
                              `${t.taggedUser.displayName} (${
                                t.status === "ACCEPTED"
                                  ? "принято"
                                  : t.status === "PENDING"
                                    ? "ждёт согласия"
                                    : "отклонено"
                              })`,
                          )
                          .join(", ")}
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      className="input !min-h-0 !py-1.5 text-xs"
                      placeholder="username друга"
                      value={tagUsername[p.id] ?? ""}
                      onChange={(e) =>
                        setTagUsername((s) => ({ ...s, [p.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-ghost !min-h-0 !px-2 !py-1 text-xs"
                      disabled={pending}
                      onClick={() => createTag(p.id)}
                    >
                      Отметить
                    </button>
                  </div>
                  {p.tags
                    .filter((t) => t.status !== "ACCEPTED")
                    .map((t) => (
                      <TagActions key={t.id} tagId={t.id} kind="remove" />
                    ))}
                </div>
              </>
            ) : (
              <>
                {p.caption && <p className="mt-1 text-sm">{p.caption}</p>}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {p.tags
                    .filter((t) => t.status === "ACCEPTED")
                    .map((t) => t.taggedUser.displayName)
                    .join(", ") || ""}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>

      {isAuthor && photos.length < maxPhotos && (
        <div className="mt-3">
          <label className="btn btn-primary cursor-pointer">
            📷 Загрузить фото
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
        </div>
      )}
      {uploading && <p className="mt-2 text-sm text-[var(--muted)]">Загружаем…</p>}
      {pending && <p className="mt-2 text-sm text-[var(--muted)]">Сохраняем…</p>}
      {error && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
