/** Русское склонение по числу: plural(5, "место", "места", "мест") → "мест". */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** "5 мест" */
export function countLabel(n: number, one: string, few: string, many: string): string {
  return `${n} ${plural(n, one, few, many)}`;
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Minsk",
  });
}

export function formatDateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Minsk",
  });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Minsk",
  });
}

/** Короткое имя зоны: "Минск — Верхний город" → "Верхний город". */
export function shortZoneName(name: string): string {
  const parts = name.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : name;
}
