import { Suspense } from "react";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";

/**
 * Сессия читается внутри Suspense-границы: корневой layout остаётся
 * пригодным для пререндера (в т.ч. /_not-found), а навигация
 * дорендеривается на сервере, когда сессия известна.
 */
async function NavData() {
  const session = await auth();
  const user = session?.user
    ? {
        displayName: session.user.name ?? session.user.username,
        username: session.user.username,
        role: session.user.role as string,
      }
    : null;
  return <AppNav user={user} />;
}

function NavFallback() {
  return <div className="ml-auto h-8 w-40 animate-pulse rounded bg-gray-100" />;
}

export function AppNavContainer() {
  return (
    <Suspense fallback={<NavFallback />}>
      <NavData />
    </Suspense>
  );
}
