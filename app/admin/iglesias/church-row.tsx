"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateChurchAction } from "./actions";

type Church = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  status: string;
  needs_review: boolean;
  notes: string | null;
};

const STATUSES = [
  { value: "active", label: "Activa" },
  { value: "inactive", label: "Inactiva" },
  { value: "pending_review", label: "En revisión" },
  { value: "suspended", label: "Suspendida" },
  { value: "closed", label: "Cerrada" },
];

export function ChurchRow({
  church,
  studentCount,
}: {
  church: Church;
  studentCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(church.name);
  const [country, setCountry] = useState(church.country ?? "");
  const [city, setCity] = useState(church.city ?? "");
  const [status, setStatus] = useState(church.status);
  const [notes, setNotes] = useState(church.notes ?? "");

  function save() {
    const fd = new FormData();
    fd.set("id", church.id);
    fd.set("name", name.trim());
    fd.set("country", country.trim());
    fd.set("city", city.trim());
    fd.set("status", status);
    fd.set("notes", notes.trim());
    startTransition(async () => {
      const res = await updateChurchAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Iglesia actualizada.");
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="border-t border-white/[0.06] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-text-secondary">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-text-secondary">Estado</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-text-secondary">País</span>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-text-secondary">Ciudad</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="uppercase tracking-wide text-text-secondary">Notas internas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="rounded-md bg-brand-coral px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-sm">
      <div className="col-span-3 font-medium">{church.name}</div>
      <div className="col-span-2 text-text-secondary">{church.country ?? "—"}</div>
      <div className="col-span-2 text-text-secondary">{church.city ?? "—"}</div>
      <div className="col-span-1 text-center">
        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs">
          {studentCount}
        </span>
      </div>
      <div className="col-span-2">
        <StatusBadge status={church.status} />
      </div>
      <div className="col-span-2 text-right">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-brand-coral hover:underline"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.value === status);
  const color =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "pending_review"
        ? "bg-amber-500/15 text-amber-400"
        : status === "suspended" || status === "closed"
          ? "bg-red-500/15 text-red-400"
          : "bg-white/[0.06] text-text-secondary";
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${color}`}
    >
      {s?.label ?? status}
    </span>
  );
}
