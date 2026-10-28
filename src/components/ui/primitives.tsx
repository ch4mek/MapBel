import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const AVATAR_GRADIENTS = [
  "from-emerald-400 to-teal-700",
  "from-sky-400 to-indigo-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-fuchsia-600",
  "from-lime-400 to-emerald-600",
  "from-violet-400 to-purple-700",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Аватар-монограмма с детерминированным градиентом по username. */
export function Avatar({
  name,
  seed,
  className,
}: {
  name: string;
  seed?: string;
  className?: string;
}) {
  const g = AVATAR_GRADIENTS[hash(seed ?? name) % AVATAR_GRADIENTS.length];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white",
        g,
        className ?? "size-9 text-xs",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-forest-400 to-forest-700 transition-[width] duration-700",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-forest-50 text-forest-700">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-zinc-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Container({
  children,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const widths = { sm: "max-w-xl", md: "max-w-3xl", lg: "max-w-6xl" } as const;
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:py-10", widths[size], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid size-12 place-items-center rounded-2xl bg-forest-700 text-white shadow-lg shadow-forest-900/20">
            <Icon className="size-6" aria-hidden />
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-zinc-900">
            {Icon && <Icon className="size-[18px] text-forest-600" aria-hidden />}
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "forest",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: "forest" | "gold" | "sky" | "rose" | "violet";
  hint?: string;
}) {
  const accents = {
    forest: "bg-forest-50 text-forest-700",
    gold: "bg-gold-50 text-gold-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  } as const;
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", accents[accent])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="font-display text-xl leading-tight font-bold text-zinc-900">{value}</div>
        <div className="truncate text-xs text-zinc-500">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[11px] text-zinc-400">{hint}</div>}
      </div>
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "demo";

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-100",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  demo: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 ring-dashed",
};

export function Pill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function Alert({
  tone,
  icon: Icon,
  title,
  children,
  className,
}: {
  tone: "success" | "danger" | "info" | "warning";
  icon?: LucideIcon;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;
  return (
    <div
      className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", tones[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {Icon && <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>}
      </div>
    </div>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex", className)} aria-label={`Оценка ${value.toFixed(1)} из 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={cn("size-4", i <= rounded ? "text-amber-400" : "text-zinc-200")}
          fill="currentColor"
          aria-hidden
        >
          <path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-zinc-200/70", className)} />;
}
