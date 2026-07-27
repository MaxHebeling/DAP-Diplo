"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/**
 * Selector de periodo en el header del /pastor. Navega via ?period=YYYY-MM.
 * Permite al pastor moverse entre meses (ver julio, agosto, sept, etc).
 */
export function PeriodSelector({
  currentYear,
  currentMonth,
  basePath,
}: {
  currentYear: number;
  currentMonth: number;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(year: number, month: number) {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${basePath}?${params.toString()}`);
  }

  function prev() {
    if (currentMonth === 1) navigate(currentYear - 1, 12);
    else navigate(currentYear, currentMonth - 1);
  }
  function next() {
    if (currentMonth === 12) navigate(currentYear + 1, 1);
    else navigate(currentYear, currentMonth + 1);
  }

  const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Genera opciones: últimos 6 meses + próximos 6
  const options: Array<{ label: string; value: string }> = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(currentYear, currentMonth - 1 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    options.push({
      label: `${MONTHS[m]} ${y}`,
      value: `${y}-${String(m).padStart(2, "0")}`,
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      <button
        onClick={prev}
        aria-label="Mes anterior"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <select
        value={currentPeriod}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-").map((n) => parseInt(n, 10));
          navigate(y, m);
        }}
        className="rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        onClick={next}
        aria-label="Mes siguiente"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
