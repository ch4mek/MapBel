import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { AppNavContainer } from "@/components/app-nav-container";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MapBel — открывай Беларусь",
    template: "%s · MapBel",
  },
  description:
    "Геймифицированный дневник путешествий по Беларуси: зоны открытий, подтверждение посещений, достижения и совместные поездки.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#185e43",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Перейти к содержимому
        </a>
        <AppNavContainer />
        <main
          id="main"
          className="flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
