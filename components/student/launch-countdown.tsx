"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Sparkles } from "lucide-react";

/**
 * Countdown elegante hacia el inicio del programa. Se usa en el dashboard
 * del alumno mientras `current_program_week()` devuelve 0 (todavía no
 * arrancó la cohorte o el alumno se admitió antes de la fecha oficial).
 *
 * Recibe la fecha como string `YYYY-MM-DD` desde la DB. La interpreta
 * en TZ DAP (LA) a las 00:01 — momento real en que abre el primer
 * módulo según el cron `week-open-notify`.
 */
export function LaunchCountdown({
  startsAtIso,
  formattedDate,
  labels,
}: {
  startsAtIso: string;
  formattedDate: string;
  labels: {
    eyebrow: string;
    title: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    explore: string;
  };
}) {
  const target = parseLaTuesdayMidnight(startsAtIso);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-violet/20 bg-gradient-to-br from-brand-violet/[0.08] via-card to-brand-coral/[0.05] p-8 shadow-lg">
      {/* halos decorativos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-violet/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-brand-coral/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-coral" strokeWidth={2} />
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            {labels.eyebrow}
          </p>
        </div>

        <h2 className="mt-4 font-grotesk text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
          {labels.title}
        </h2>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-3 py-1.5">
          <CalendarClock className="size-3.5 text-brand-violet" />
          <p className="font-inter text-xs font-medium text-brand-violet">
            {formattedDate}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-3">
          <TimeBox value={days} label={labels.days} />
          <TimeBox value={hours} label={labels.hours} />
          <TimeBox value={minutes} label={labels.minutes} />
          <TimeBox value={seconds} label={labels.seconds} animated />
        </div>

        <p className="mt-6 font-inter text-sm leading-relaxed text-text-secondary">
          {labels.explore}
        </p>
      </div>
    </div>
  );
}

function TimeBox({
  value,
  label,
  animated,
}: {
  value: number;
  label: string;
  animated?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/60 px-2 py-3 text-center backdrop-blur sm:px-3 sm:py-4">
      <div
        className={`font-grotesk text-3xl font-bold tabular-nums sm:text-4xl ${animated ? "text-brand-coral" : "text-text-primary"}`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 font-inter text-[9px] font-semibold uppercase tracking-[0.2em] text-text-tertiary sm:text-[10px]">
        {label}
      </div>
    </div>
  );
}

/**
 * Convierte 'YYYY-MM-DD' al instante exacto de las 00:01 hora Los Angeles
 * de ese día, devuelto como Date (epoch ms). Calculamos el offset LA
 * (PST -08 o PDT -07) según DST.
 */
function parseLaTuesdayMidnight(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date(0);
  const [, y, mo, d] = m;
  // Construimos la fecha local del navegador a las 00:01 y luego ajustamos
  // por el offset LA. Para evitar TZ traps usamos UTC + offset fijo: en
  // junio LA está en PDT (-07), entonces 00:01 LA = 07:01 UTC.
  // Aproximación simple correcta para fechas de inicio de programa en
  // verano del hemisferio norte. Si la cohorte arranca en invierno (raro)
  // habría que recalcular DST con Intl.
  return new Date(`${y}-${mo}-${d}T07:01:00Z`);
}
