export function startOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function parseDateValue(iso: string) {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
}

export function formatShortDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(parseDateValue(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTime(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function dayDelta(iso: string | null, today = startOfLocalDay()) {
  if (!iso) return null;
  const date = startOfLocalDay(parseDateValue(iso));
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
