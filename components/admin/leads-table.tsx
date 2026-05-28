"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Download, Mail, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  country_code: string | null;
  message: string | null;
  source: string;
  page_path: string | null;
  status: string;
  offered_at: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevos" },
  { value: "contacted", label: "Contactados" },
  { value: "offered", label: "Ofertados" },
  { value: "converted", label: "Convertidos" },
  { value: "lost", label: "Perdidos" },
] as const;

export function LeadsTable({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [status, setStatus] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Suscripción realtime: cuando entra un nuevo lead, aparece arriba
  // con un flash visual de 3 segundos. `.on()` ANTES de `.subscribe()`.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new as Lead;
          setLeads((prev) =>
            prev.some((l) => l.id === row.id) ? prev : [row, ...prev],
          );
          setFlashIds((prev) => new Set(prev).add(row.id));
          setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }, 3000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const countries = useMemo(() => {
    const set = new Map<string, string>();
    for (const l of leads) {
      if (l.country_code) set.set(l.country_code, l.country ?? l.country_code);
    }
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (country !== "all" && l.country_code !== country) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.email} ${l.full_name ?? ""} ${l.country ?? ""} ${l.message ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, status, country, search]);

  async function sendOffer(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}/send-offer`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "No se pudo mandar la oferta");
        return;
      }
      startTransition(() => {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: "offered",
                  offered_at: l.offered_at ?? new Date().toISOString(),
                }
              : l,
          ),
        );
      });
    } catch (e) {
      alert(`Error de red: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    const headers = [
      "fecha",
      "email",
      "nombre",
      "telefono",
      "pais",
      "pais_codigo",
      "mensaje",
      "fuente",
      "pagina",
      "estado",
      "oferta_enviada",
    ];
    const rows = filtered.map((l) => [
      l.created_at,
      l.email,
      l.full_name ?? "",
      l.phone ?? "",
      l.country ?? "",
      l.country_code ?? "",
      (l.message ?? "").replace(/\n/g, " "),
      l.source,
      l.page_path ?? "",
      l.status,
      l.offered_at ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar email, nombre, mensaje…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-card py-2 pl-9 pr-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet/40"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border bg-card px-3 py-2 font-inter text-sm outline-none focus:border-brand-violet"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border bg-card px-3 py-2 font-inter text-sm outline-none focus:border-brand-violet"
        >
          <option value="all">Todos los países</option>
          {countries.map(([code, name]) => (
            <option key={code} value={code}>
              {countryFlag(code)} {name}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          <Download className="size-4" />
          CSV ({filtered.length})
        </Button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full font-inter text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Sin leads con estos filtros.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr
                key={l.id}
                className={`hover:bg-muted/20 ${flashIds.has(l.id) ? "animate-pulse bg-brand-coral/10" : ""}`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(l.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {l.full_name ?? "—"}
                  </div>
                  <a
                    href={`mailto:${l.email}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-violet hover:underline"
                  >
                    <Mail className="size-3" />
                    {l.email}
                  </a>
                  {l.message && (
                    <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">
                      "{l.message}"
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-base">
                      {countryFlag(l.country_code)}
                    </span>
                    <span className="text-xs">
                      {l.country ?? l.country_code ?? "—"}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  <div>{labelForSource(l.source)}</div>
                  {l.page_path && (
                    <div className="text-[10px] opacity-60">{l.page_path}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {l.offered_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="size-3" />
                      Oferta enviada
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendOffer(l.id)}
                      disabled={busyId === l.id}
                    >
                      <Send className="size-3.5" />
                      {busyId === l.id ? "Enviando…" : "Enviar oferta DAP"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    new: { label: "Nuevo", classes: "bg-brand-coral/10 text-brand-coral" },
    contacted: {
      label: "Contactado",
      classes: "bg-brand-violet/10 text-brand-violet",
    },
    offered: {
      label: "Ofertado",
      classes: "bg-amber-400/10 text-amber-400",
    },
    converted: {
      label: "Convertido",
      classes: "bg-emerald-400/10 text-emerald-400",
    },
    lost: { label: "Perdido", classes: "bg-muted text-muted-foreground" },
  };
  const it = map[status] ?? { label: status, classes: "bg-muted" };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${it.classes}`}
    >
      {it.label}
    </span>
  );
}

function labelForSource(source: string): string {
  const map: Record<string, string> = {
    widget: "Widget público",
    landing: "Landing",
    promo_ar: "Promo Argentina",
    other: "Otro",
  };
  return map[source] ?? source;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌎";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return (
    String.fromCodePoint(code.charCodeAt(0) + base) +
    String.fromCodePoint(code.charCodeAt(1) + base)
  );
}
