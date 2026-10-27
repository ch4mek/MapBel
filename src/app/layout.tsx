import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { AppNavContainer } from "@/components/app-nav-container";

export const metadata: Metadata = {
  title: "MapBel — открывай Беларусь",
  description:
    "Геймифицированный дневник путешествий по Беларуси: зоны открытий, подтверждение посещений, достижения и совместные поездки.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#176b52",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden>🗺️</span>
              <span>
                Map<span className="text-[var(--brand)]">Bel</span>
              </span>
            </Link>
            <AppNavContainer />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 md:pb-8">
          {children}
        </main>
        <footer className="hidden border-t bg-white py-4 text-center text-xs text-[var(--muted)] md:block">
          MapBel — учебный проект. Данные зон и мест демонстрационные. Карта ©{" "}
          <a
            className="underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          contributors.
        </footer>
      </body>
    </html>
  );
}
