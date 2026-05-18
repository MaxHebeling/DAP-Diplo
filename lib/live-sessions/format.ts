/**
 * Helpers de formato/estado para sesiones en vivo, usables tanto en
 * Server como en Client Components.
 */

export function liveStatus(
  scheduledIso: string,
  durationMin: number,
): "live" | "soon" | "future" | "ended" {
  const now = Date.now();
  const start = new Date(scheduledIso).getTime();
  const end = start + durationMin * 60_000;
  if (now >= start && now <= end) return "live";
  if (now >= start - 15 * 60_000 && now < start) return "soon";
  if (now < start - 15 * 60_000) return "future";
  return "ended";
}

export function formatLocalDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLocalDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
