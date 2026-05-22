"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Globe, Search, Sparkles } from "lucide-react";

import { COUNTRIES, type Country } from "@/lib/data/countries";

type Props = {
  onSelect: (country: Country) => void;
};

export function CountrySelector({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  }, [query]);

  const featured = COUNTRIES.filter((c) => c.spanishSpeaking);
  const rest = COUNTRIES.filter((c) => !c.spanishSpeaking);

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="px-8 pb-2 pt-8 sm:px-10 sm:pt-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
            <Globe className="size-5" strokeWidth={1.8} />
          </div>
          <span className="font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
            Paso 1 de 2
          </span>
        </div>
        <h2 className="mt-5 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
          ¿Desde dónde te conectas?
        </h2>
        <p className="mt-3 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
          Tu país nos ayuda a personalizar tu experiencia y prepararte
          el camino correcto dentro del Diplomado.
        </p>

        {/* Search */}
        <div className="relative mt-7">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá tu país..."
            autoComplete="off"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-4 font-inter text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-brand-violet/40 focus:bg-white/[0.05] focus:ring-4 focus:ring-brand-violet/15"
          />
        </div>
      </div>

      {/* Scrollable area */}
      <div className="mt-4 flex-1 overflow-y-auto px-8 pb-8 sm:px-10 sm:pb-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
        {filtered ? (
          <CountryGrid countries={filtered} onSelect={onSelect} />
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              <Sparkles className="size-3 text-brand-coral" />
              Destacados · Hispanohablantes
            </p>
            <CountryGrid countries={featured} onSelect={onSelect} />

            <p className="mb-3 mt-8 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Resto del mundo
            </p>
            <CountryGrid countries={rest} onSelect={onSelect} />
          </>
        )}
      </div>
    </div>
  );
}

function CountryGrid({
  countries,
  onSelect,
}: {
  countries: Country[];
  onSelect: (c: Country) => void;
}) {
  if (countries.length === 0) {
    return (
      <p className="py-10 text-center font-inter text-sm text-text-tertiary">
        No encontramos ese país. Probá con otro nombre.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {countries.map((c, i) => (
        <motion.button
          key={c.code}
          type="button"
          onClick={() => onSelect(c)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(i, 12) * 0.012 }}
          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-brand-violet/40 hover:bg-brand-violet/[0.06]"
        >
          {/* Hover glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100 [background:radial-gradient(60%_120%_at_0%_50%,rgba(123,97,255,0.18),transparent_70%)]"
          />

          <span className="text-2xl leading-none">{c.flag}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-inter text-sm font-medium text-text-primary">
              {c.name}
            </p>
            <p className="font-inter text-xs text-text-tertiary">
              {c.dialCode} · {c.code}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
