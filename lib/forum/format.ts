/**
 * Formato de tiempo relativo en español, breve ("hace 2h", "ayer", "hace 3d").
 * Para fechas mayores a 7 días, muestra fecha absoluta corta.
 */
export function timeAgo(iso: string): string {
  const now = Date.now();
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "ahora";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "ahora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const d = Math.floor(hr / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d}d`;
  // Mayor a 7 días: fecha corta absoluta
  const date = new Date(iso);
  const day = date.getUTCDate();
  const month = date.toLocaleString("es", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();
  return year === currentYear
    ? `${day} ${month}`
    : `${day} ${month} ${year}`;
}

export function snippet(body: string, max: number = 150): string {
  const stripped = body.replace(/\s+/g, " ").trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).trimEnd() + "…";
}
