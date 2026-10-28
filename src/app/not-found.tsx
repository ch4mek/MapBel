import Link from "next/link";
import { Compass, Map as MapIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-3xl bg-forest-50 text-forest-700">
          <Compass className="size-10" aria-hidden />
        </span>
        <p className="mt-6 font-display text-5xl font-bold text-forest-700">404</p>
        <h1 className="mt-2 font-display text-xl font-bold text-zinc-900">Здесь пока ничего не открыто</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Страница не найдена или доступ к ней ограничен — например, это приватная запись дневника.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          <MapIcon className="size-4" />
          Вернуться к карте
        </Link>
      </div>
    </div>
  );
}
