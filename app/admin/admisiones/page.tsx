import Link from "next/link";
import { Filter } from "lucide-react";

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

export default async function AdminAdmisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
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

  const supabase = await createClient();
  let query = supabase
    .from("admissions")
    .select(
      "id, full_name, email, country, city, church_name, belongs_to_network, network_name, status, submitted_at, approved_at, reviewed_at, admission_letter_sent_at",
    )
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (q) {
    // ILIKE en full_name, email, church_name
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,church_name.ilike.%${q}%`,
    );
  }

  const { data, error } = await query.returns<AdmissionRow[]>();
  if (error) {
    throw new Error(`No se pudieron cargar admisiones: ${error.message}`);
  }
  const rows = data ?? [];

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
            Revisá las solicitudes de admisión, aprobá o rechazá. La carta PDF
            firmada se envía automáticamente 24h después de la aprobación.
          </p>
        </header>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => {
              const href =
                t.key === "pending"
                  ? `/admin/admisiones${q ? `?q=${encodeURIComponent(q)}` : ""}`
                  : `/admin/admisiones?status=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
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
      </div>
    </main>
  );
}
