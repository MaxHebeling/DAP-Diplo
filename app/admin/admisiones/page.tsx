import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admisiones — Admin DAP",
};

type AdmissionRow = {
  id: string;
  full_name: string;
  email: string;
  country: string;
  city: string | null;
  church_name: string | null;
  belongs_to_network: boolean;
  network_name: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  submitted_at: string;
  approved_at: string | null;
  reviewed_at: string | null;
  admission_letter_sent_at: string | null;
};

type Status = "all" | "pending" | "under_review" | "approved" | "rejected";

const STATUS_TABS: Array<{ key: Status; label: string }> = [
  { key: "pending", label: "Pendientes" },
  { key: "under_review", label: "En revisión" },
  { key: "approved", label: "Aprobadas" },
  { key: "rejected", label: "Rechazadas" },
  { key: "all", label: "Todas" },
];

function statusBadge(s: AdmissionRow["status"]) {
  switch (s) {
    case "pending":
      return <Badge variant="outline">Pendiente</Badge>;
    case "under_review":
      return <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">En revisión</Badge>;
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">Aprobada</Badge>;
    case "rejected":
      return <Badge className="bg-brand-coral/15 text-brand-coral hover:bg-brand-coral/15">Rechazada</Badge>;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function networkLabel(row: AdmissionRow): string {
  if (!row.belongs_to_network) return "No · requiere carta";
  if (row.network_name === "reino_y_avivamiento") return "Red Apostólica R&A";
  if (row.network_name === "revival_kingdom") return "Revival & Kingdom";
  return "Sí";
}

const PAGE_SIZE = 25;

// Escape para Supabase .or() — `,` y `)` rompen el parser del filtro
// string. Reemplazos defensivos antes de inyectar el query del usuario.
function escapeOrValue(s: string): string {
  return s.replace(/,/g, "\\,").replace(/\)/g, "\\)");
}

function buildHref(
  status: Status,
  q: string,
  page: number,
): string {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/admisiones${qs ? `?${qs}` : ""}`;
}

export default async function AdminAdmisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (
    ["all", "pending", "under_review", "approved", "rejected"].includes(
      params.status ?? "",
    )
      ? (params.status as Status)
      : "pending"
  ) as Status;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  let query = supabase
    .from("admissions")
    .select(
      "id, full_name, email, country, city, church_name, belongs_to_network, network_name, status, submitted_at, approved_at, reviewed_at, admission_letter_sent_at",
      { count: "exact" },
    )
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (q) {
    // ILIKE en full_name, email, church_name (índices GIN trgm en migración 0022)
    const safeQ = escapeOrValue(q);
    query = query.or(
      `full_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,church_name.ilike.%${safeQ}%`,
    );
  }

  const { data, error, count } = await query.returns<AdmissionRow[]>();
  if (error) {
    throw new Error(`No se pudieron cargar admisiones: ${error.message}`);
  }
  const rows = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : from + 1;
  const lastRow = Math.min(to + 1, total);

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Admin · DAP
          </p>
          <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
            Admisiones
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revisa las solicitudes de admisión, aprueba o rechaza. La carta PDF
            firmada se envía automáticamente 24h después de la aprobación.
          </p>
        </header>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => {
              // Cambio de tab → reset a página 1
              const href = buildHref(t.key, q, 1);
              const active = statusFilter === t.key;
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={
                    active
                      ? "rounded-full bg-brand-coral/15 px-3 py-1.5 text-xs font-medium text-brand-coral"
                      : "rounded-full border border-white/[0.1] px-3 py-1.5 text-xs text-muted-foreground hover:border-white/[0.2] hover:text-foreground"
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          <form className="ml-auto flex items-center gap-2" action="/admin/admisiones" method="get">
            {statusFilter !== "pending" && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, email o iglesia"
                className="w-72 rounded-md border border-white/[0.1] bg-white/[0.04] py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
              />
            </div>
          </form>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06]">
                <TableHead>Aspirante</TableHead>
                <TableHead className="hidden md:table-cell">Iglesia</TableHead>
                <TableHead className="hidden lg:table-cell">País</TableHead>
                <TableHead className="hidden md:table-cell">Red</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Enviada</TableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                    No hay admisiones en este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="border-white/[0.04]">
                    <TableCell>
                      <p className="font-medium text-foreground">{row.full_name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {row.church_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {row.city ? `${row.city}, ` : ""}{row.country}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {networkLabel(row)}
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {formatDate(row.submitted_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/admisiones/${row.id}`}
                        className="text-sm font-medium text-brand-coral hover:underline"
                      >
                        Ver →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Mostrando <span className="font-medium text-foreground">{firstRow}</span>–
              <span className="font-medium text-foreground">{lastRow}</span> de{" "}
              <span className="font-medium text-foreground">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildHref(statusFilter, q, page - 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-white/[0.2] hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground/40">
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </span>
              )}
              <span className="px-2 text-xs text-muted-foreground">
                Página {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildHref(statusFilter, q, page + 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-white/[0.2] hover:text-foreground"
                >
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground/40">
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
