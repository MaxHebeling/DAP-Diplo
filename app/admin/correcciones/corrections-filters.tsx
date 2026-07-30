"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

/**
 * Buscador + filtros por país/semana para /admin/correcciones.
 * Preserva los demás query params (filter, etc.) al navegar.
 */
export function CorrectionsFilters({
  currentQ,
  currentCountry,
  currentWeek,
  availableCountries,
  availableWeeks,
}: {
  currentQ: string;
  currentCountry: string;
  currentWeek: number | null;
  currentFilter: string;
  availableCountries: string[];
  availableWeeks: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(currentQ);

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`/admin/correcciones${params.toString() ? "?" + params : ""}`);
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    apply({ q: q.trim() || null });
  }

  const hasFilters = !!(currentQ || currentCountry || currentWeek !== null);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-4">
      <form onSubmit={submitSearch} className="flex flex-1 min-w-[240px] items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar alumno por nombre…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-violet"
          />
        </div>
        {q !== currentQ && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-violet px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Buscar
          </button>
        )}
      </form>

      <div className="flex items-center gap-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">País</label>
        <select
          value={currentCountry}
          onChange={(e) => apply({ country: e.target.value || null })}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-brand-violet"
        >
          <option value="">Todos</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Semana</label>
        <select
          value={currentWeek ?? ""}
          onChange={(e) => apply({ week: e.target.value || null })}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-brand-violet"
        >
          <option value="">Todas</option>
          {availableWeeks.map((w) => (
            <option key={w} value={String(w)}>Sem {w}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            apply({ q: null, country: null, week: null });
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-brand-coral/40 hover:text-brand-coral"
        >
          <X className="size-3" /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
