"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-3xl bg-red-50 text-red-600">
          <TriangleAlert className="size-10" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-xl font-bold text-zinc-900">Что-то пошло не так</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Не удалось загрузить страницу. Проверьте подключение к интернету и попробуйте ещё раз.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RotateCcw className="size-4" />
            Повторить
          </button>
          <Link href="/" className="btn btn-secondary">
            На карту
          </Link>
        </div>
      </div>
    </div>
  );
}
