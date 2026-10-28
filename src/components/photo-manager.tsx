"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  ImagePlus,
  Images,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { TagActions } from "@/components/tag-actions";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export interface PhotoItem {
  id: string;
  previewKey: string;
  storageKey: string;
  caption: string | null;
  width: number;
  height: number;
  tags: { id: string; status: string; taggedUser: { displayName: string; username: string } }[];
}

export function PhotoManager({
  entryId,
  photos,
  maxPhotos,
  isAuthor,
  friends = [],
}: {
  entryId: string;
  photos: PhotoItem[];
  maxPhotos: number;
  isAuthor: boolean;
  friends?: { username: string; displayName: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch(`/api/diary/${entryId}/photos`, { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) setError(data?.error?.message ?? "Не удалось загрузить фото");
      else router.refresh();
    } catch {
      setError("Нет подключения к интернету — фото не загружены");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function call(url: string, init: RequestInit, failMsg: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(url, init);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? failMsg);
        return;
      }
      router.refresh();
    });
  }

  const canAdd = isAuthor && photos.length < maxPhotos;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
          <Images className="size-[18px] text-forest-600" />
          Фотографии
        </h2>
        <span className="text-xs font-semibold text-zinc-500">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      <div className="p-5">
        {photos.length === 0 && !isAuthor && (
          <EmptyState icon={Images} title="Фотографий нет" className="border-0 bg-zinc-50 py-8" />
        )}

        {photos.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {photos.map((p, i) => (
              <li key={p.id} className="group overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-zinc-200"
                  aria-label={`Открыть фото ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${p.previewKey}`}
                    alt={p.caption ?? ""}
                    className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </button>
                <div className="flex flex-col gap-2.5 p-3">
                  {isAuthor ? (
                    <div className="flex gap-1.5">
                      <input
                        className="input h-9 rounded-lg text-xs"
                        placeholder="Добавить подпись…"
                        defaultValue={p.caption ?? ""}
                        aria-label="Подпись к фото"
                        onBlur={(e) => {
                          if (e.target.value !== (p.caption ?? "")) {
                            call(
                              `/api/photos/${p.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ caption: e.target.value }),
                              },
                              "Не удалось сохранить подпись",
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-danger-soft btn-icon h-9 w-9 shrink-0 rounded-lg"
                        disabled={pending}
                        onClick={() => call(`/api/photos/${p.id}`, { method: "DELETE" }, "Не удалось удалить фото")}
                        aria-label="Удалить фото"
                        title="Удалить фото"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : (
                    p.caption && <p className="text-sm text-zinc-700">{p.caption}</p>
                  )}

                  {(p.tags.length > 0 || isAuthor) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full py-0.5 pr-1.5 pl-2 text-[11px] font-semibold",
                            t.status === "ACCEPTED" && "bg-forest-50 text-forest-800",
                            t.status === "PENDING" && "border border-dashed border-zinc-300 bg-white text-zinc-500",
                            t.status === "REJECTED" && "bg-zinc-100 text-zinc-400 line-through",
                          )}
                          title={
                            t.status === "PENDING"
                              ? "Ждёт согласия"
                              : t.status === "REJECTED"
                                ? "Отклонено"
                                : "Отметка подтверждена"
                          }
                        >
                          {t.status === "PENDING" ? <Clock className="size-3" /> : <Tag className="size-3" />}
                          {t.taggedUser.displayName}
                          {isAuthor && t.status !== "ACCEPTED" && <TagActions tagId={t.id} kind="remove" />}
                        </span>
                      ))}
                      {isAuthor && (
                        <TagPicker
                          friends={friends.filter((f) => !p.tags.some((t) => t.taggedUser.username === f.username))}
                          disabled={pending}
                          onPick={(username) =>
                            call(
                              `/api/photos/${p.id}/tags`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ username }),
                              },
                              "Не удалось отметить друга",
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canAdd && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void upload(Array.from(e.dataTransfer.files));
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
              photos.length > 0 && "mt-4",
              dragOver ? "border-forest-500 bg-forest-50" : "border-zinc-300 hover:border-forest-400 hover:bg-zinc-50",
            )}
          >
            {uploading ? (
              <span className="size-8 animate-spin rounded-full border-[3px] border-forest-200 border-t-forest-700" />
            ) : (
              <span className="grid size-12 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                <ImagePlus className="size-6" />
              </span>
            )}
            <span className="text-sm font-semibold text-zinc-800">
              {uploading ? "Загружаем и обрабатываем…" : "Перетащите фото или нажмите, чтобы выбрать"}
            </span>
            <span className="text-xs text-zinc-500">
              JPEG, PNG, WebP · до 10 МБ · ещё {maxPhotos - photos.length} шт.
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
        )}

        {error && (
          <Alert tone="danger" icon={CircleAlert} className="mt-4">
            {error}
          </Alert>
        )}
      </div>

      {lightbox !== null && photos[lightbox] && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}

function TagPicker({
  friends,
  disabled,
  onPick,
}: {
  friends: { username: string; displayName: string }[];
  disabled: boolean;
  onPick: (username: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <span className="text-[11px] text-zinc-400" title="Добавьте друзей, чтобы отмечать их на фото">
        <UserPlus className="mr-1 inline size-3" />
        нет друзей для отметки
      </span>
    );
  }
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Отметить друга</span>
      <select
        className="h-7 cursor-pointer appearance-none rounded-full border border-zinc-200 bg-white pr-2.5 pl-6 text-[11px] font-semibold text-zinc-600 hover:border-zinc-300"
        disabled={disabled}
        value=""
        onChange={(e) => e.target.value && onPick(e.target.value)}
      >
        <option value="">Отметить</option>
        {friends.map((f) => (
          <option key={f.username} value={f.username}>
            {f.displayName}
          </option>
        ))}
      </select>
      <UserPlus className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-zinc-500" />
    </label>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: PhotoItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const p = photos[index];
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, photos.length, onClose, onIndex]);

  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Закрыть"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/${p.storageKey}`} alt={p.caption ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Следующее фото"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <div className="p-5 text-center text-sm text-white/85" onClick={(e) => e.stopPropagation()}>
        {p.caption ?? "\u00a0"}
      </div>
    </div>
  );
}
