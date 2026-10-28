import { Castle, Footprints, Medal, Trees, Trophy, Users } from "lucide-react";

const FEATURES = [
  { icon: Medal, text: "Открывайте зоны: бронза, серебро и золото" },
  { icon: Castle, text: "Замки, музеи, экотропы и гастрономия" },
  { icon: Users, text: "Путешествуйте с друзьями и сравнивайте прогресс" },
  { icon: Trophy, text: "Собирайте достижения и ведите дневник" },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Trees className="absolute -right-16 -bottom-20 size-[28rem] text-white/[0.06]" aria-hidden />
        <Footprints className="absolute top-24 right-24 size-24 rotate-12 text-white/[0.07]" aria-hidden />
        <div className="relative">
          <p className="text-sm font-semibold tracking-widest text-forest-200 uppercase">MapBel</p>
          <h2 className="mt-4 max-w-md font-display text-4xl leading-tight font-bold">
            Откройте Беларусь — зона за зоной
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
            Приезжайте на место, нажимайте «Я здесь» и превращайте путешествия в карту открытий.
          </p>
        </div>
        <ul className="relative flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-sm text-white/90">
              <span className="grid size-10 place-items-center rounded-xl bg-white/10">
                <f.icon className="size-5" aria-hidden />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
