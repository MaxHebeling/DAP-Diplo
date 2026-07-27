import Link from "next/link";
import { Accessibility, Mail, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Modo simplificado · Admin DAP" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  country: string | null;
  matricula: string | null;
  program_start_date: string | null;
  admission_status: string | null;
};

export default async function SimplifiedListPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("profiles")
    .select("id, full_name, country, matricula, program_start_date, admission_status")
    .eq("simplified_mode", true)
    .eq("role", "student")
    .order("full_name", { ascending: true })
    .returns<Row[]>();

  const students = rows ?? [];

  // Cross-lookup de emails via auth.users
  const emails = new Map<string, string>();
  for (const s of students) {
    const { data: au } = await admin.auth.admin.getUserById(s.id);
    if (au?.user?.email) emails.set(s.id, au.user.email);
  }

  // Encontrar admission_id por user_id para que el link a la ficha funcione
  const admissionIds = new Map<string, string>();
  if (students.length) {
    const { data: ads } = await admin
      .from("admissions")
      .select("id, user_id")
      .in("user_id", students.map((s) => s.id));
    for (const a of ads ?? []) admissionIds.set(a.user_id, a.id);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <Accessibility className="size-6" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400">Ruta simplificada</p>
          <h1 className="mt-1 text-2xl font-bold">Alumnos en modo simplificado</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ven solo intro · enseñanza · impartición, con botón grande para descargar PDF.
            Sin tarea, evaluación ni quiz. Se puede activar o desactivar desde la ficha de cada alumno.
          </p>
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total</p>
          <p className="mt-1 text-3xl font-bold text-amber-300">{students.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Aprobados</p>
          <p className="mt-1 text-3xl font-bold">
            {students.filter((s) => s.admission_status === "approved").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Países distintos</p>
          <p className="mt-1 text-3xl font-bold">
            {new Set(students.map((s) => s.country).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center text-muted-foreground">
          <Accessibility className="mx-auto mb-3 size-8 opacity-50" />
          <p className="font-medium">Aún no hay alumnos en modo simplificado.</p>
          <p className="mt-1 text-xs">
            Activalo desde <Link href="/admin/admisiones" className="text-brand-coral hover:underline">cualquier ficha de alumno</Link>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Alumno</th>
                <th className="px-4 py-3 text-left">Matrícula</th>
                <th className="px-4 py-3 text-left">País</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Inicio</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.matricula ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    {emails.get(s.id) ? (
                      <a
                        href={`mailto:${emails.get(s.id)}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-coral hover:underline"
                      >
                        <Mail className="size-3" /> {emails.get(s.id)}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.program_start_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {admissionIds.get(s.id) ? (
                      <Link
                        href={`/admin/admisiones/${admissionIds.get(s.id)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-coral hover:underline"
                      >
                        Abrir <ExternalLink className="size-3" />
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
