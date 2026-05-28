"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Globe2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LiveVisit = {
  id: string;
  country: string | null;
  country_code: string | null;
  page_path: string | null;
  created_at: string;
};

/**
 * Panel "Visitas en vivo" para el dashboard admin.
 *
 * - Hace una hidratación inicial con las últimas N visitas via REST.
 * - Se suscribe a INSERTs en `visit_logs` por Supabase Realtime.
 * - Muestra contador "activos ahora" (visitas últimos 5 min).
 * - Cada nueva visita aparece con animación motion.
 *
 * IMPORTANTE: `.on()` debe ir ANTES de `.subscribe()` o el handler queda
 * muerto silencioso. Cuidado al editar.
 */
export function LiveVisitorsPanel({ initial }: { initial: LiveVisit[] }) {
  const [feed, setFeed] = useState<LiveVisit[]>(initial);
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);

  // Tick cada 30s para que el contador "activos ahora" se vaya recalculando
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live-visits")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visit_logs" },
        (payload) => {
          const row = payload.new as LiveVisit;
          setFeed((prev) => [row, ...prev].slice(0, 30));
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeNow = useMemo(() => {
    // `tick` está en la dep array para forzar recompute cada 30s
    void tick;
    const cutoff = Date.now() - 5 * 60 * 1000;
    return feed.filter((v) => new Date(v.created_at).getTime() >= cutoff).length;
  }, [feed, tick]);

  return (
    <section className="mb-8 rounded-xl border bg-gradient-to-br from-card to-card/50 p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="size-5 text-brand-coral" strokeWidth={2} />
            {connected && (
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-emerald-400" />
            )}
          </div>
          <div>
            <h2 className="font-grotesk text-sm font-semibold uppercase tracking-widest text-foreground">
              En vivo
            </h2>
            <p className="font-inter text-[11px] text-muted-foreground">
              {connected ? "Conectado · actualiza solo" : "Reconectando…"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Activos ahora
          </p>
          <p className="font-grotesk text-2xl font-bold text-brand-coral">
            {activeNow}
          </p>
          <p className="font-inter text-[10px] text-muted-foreground">
            últimos 5 min
          </p>
        </div>
      </header>

      <div className="max-h-72 overflow-y-auto">
        {feed.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Globe2 className="size-4" />
            <span className="font-inter text-sm">
              Esperando visitas… (dejá esta pestaña abierta)
            </span>
          </div>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {feed.slice(0, 20).map((v) => (
                <motion.li
                  key={v.id}
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 16, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card/60 px-3 py-2 hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xl">
                      {countryFlag(v.country_code)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-inter text-sm font-medium text-foreground">
                        {v.country ?? v.country_code ?? "Desconocido"}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {v.page_path || "/"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-inter text-[10px] text-muted-foreground">
                    {timeAgo(v.created_at)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌎";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return (
    String.fromCodePoint(code.charCodeAt(0) + base) +
    String.fromCodePoint(code.charCodeAt(1) + base)
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`;
  return `hace ${Math.floor(diff / 86_400_000)}d`;
}
