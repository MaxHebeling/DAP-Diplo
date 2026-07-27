import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ChurchRow } from "./church-row";
import { UnassignedRow } from "./unassigned-row";
import { NewChurchForm } from "./new-church-form";

export const metadata = { title: "Iglesias · Admin DAP" };
export const dynamic = "force-dynamic";

type Church = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  status: string;
  needs_review: boolean;
  notes: string | null;
};

type UnassignedStudent = {
  id: string;
  full_name: string;
  admission_church_name: string | null;
  admission_country: string | null;
  admission_city: string | null;
};

export default async function IglesiasPage() {
  const { admin } = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const service = createAdminClient();

  // Traer todas las iglesias + conteo de alumnos por iglesia
  const { data: churches = [] } = await service
    .from("churches")
    .select("id, name, country, city, status, needs_review, notes")
    .order("country", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const { data: countsRaw = [] } = await service
    .from("profiles")
    .select("church_id")
    .not("church_id", "is", null);
  const studentCounts = new Map<string, number>();
  for (const p of countsRaw ?? []) {
    if (p.church_id) {
      studentCounts.set(p.church_id, (studentCounts.get(p.church_id) ?? 0) + 1);
    }
  }

  // Alumnos aprobados sin iglesia asignada — join manual con admissions
  // para mostrar el texto libre que pusieron en el form original.
  const { data: unassignedProfiles = [] } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("admission_status", "approved")
    .is("church_id", null);

  const unassignedIds = (unassignedProfiles ?? []).map((p) => p.id);
  const admissionsByUser = new Map<
    string,
    { church_name: string | null; country: string | null; city: string | null }
  >();
  if (unassignedIds.length > 0) {
    const { data: adms = [] } = await service
      .from("admissions")
      .select("user_id, church_name, country, city")
      .in("user_id", unassignedIds)
      .eq("status", "approved");
    for (const a of adms ?? []) {
      if (a.user_id) admissionsByUser.set(a.user_id, {
        church_name: a.church_name,
        country: a.country,
        city: a.city,
      });
    }
  }

  const unassigned: UnassignedStudent[] = (unassignedProfiles ?? []).map((p) => {
    const adm = admissionsByUser.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      admission_church_name: adm?.church_name ?? null,
      admission_country: adm?.country ?? null,
      admission_city: adm?.city ?? null,
    };
  });

  // Opciones para el dropdown de asignación (solo iglesias activas)
  const activeChurches = (churches as Church[])
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, name: c.name, country: c.country, city: c.city }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
          Admin DAP
        </p>
        <h1 className="mt-1 font-grotesk text-2xl font-bold">Iglesias</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Catálogo canónico. Los alumnos eligen su iglesia desde aquí durante
          la admisión. Los que aparecen como "sin iglesia" abajo requieren
          asignación manual.
        </p>
      </header>

      {/* Sección: alumnos sin iglesia */}
      {unassigned.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-grotesk text-lg font-semibold">
              Alumnos sin iglesia asignada
            </h2>
            <span className="text-xs text-text-secondary">
              {unassigned.length} alumno{unassigned.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02]">
            <div className="grid grid-cols-12 gap-3 border-b border-white/[0.06] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              <div className="col-span-4">Alumno</div>
              <div className="col-span-3">Iglesia (texto libre)</div>
              <div className="col-span-2">Ubicación</div>
              <div className="col-span-3">Asignar</div>
            </div>
            {unassigned.map((s) => (
              <UnassignedRow
                key={s.id}
                student={s}
                churches={activeChurches}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sección: crear iglesia */}
      <section className="mb-10">
        <h2 className="mb-3 font-grotesk text-lg font-semibold">
          Crear iglesia nueva
        </h2>
        <NewChurchForm />
      </section>

      {/* Sección: catálogo de iglesias */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-grotesk text-lg font-semibold">Catálogo</h2>
          <span className="text-xs text-text-secondary">
            {(churches as Church[]).length} iglesia
            {(churches as Church[]).length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <div className="grid grid-cols-12 gap-3 border-b border-white/[0.06] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-2">País</div>
            <div className="col-span-2">Ciudad</div>
            <div className="col-span-1 text-center">Alumnos</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>
          {(churches as Church[]).map((c) => (
            <ChurchRow
              key={c.id}
              church={c}
              studentCount={studentCounts.get(c.id) ?? 0}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
