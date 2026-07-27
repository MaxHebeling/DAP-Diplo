"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignStudentChurchAction } from "./actions";

type ChurchOption = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
};

type Student = {
  id: string;
  full_name: string;
  admission_church_name: string | null;
  admission_country: string | null;
  admission_city: string | null;
};

export function UnassignedRow({
  student,
  churches,
}: {
  student: Student;
  churches: ChurchOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<string>("");

  function assign() {
    if (!selection) return;
    const fd = new FormData();
    fd.set("user_id", student.id);
    fd.set("church_id", selection);
    startTransition(async () => {
      const res = await assignStudentChurchAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${student.full_name} asignado.`);
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-sm">
      <div className="col-span-4">
        <div className="font-medium">{student.full_name}</div>
      </div>
      <div className="col-span-3 text-text-secondary">
        {student.admission_church_name ? (
          <span className="italic">"{student.admission_church_name}"</span>
        ) : (
          <span className="text-text-tertiary">(no completó)</span>
        )}
      </div>
      <div className="col-span-2 text-xs text-text-secondary">
        {[student.admission_country, student.admission_city]
          .filter(Boolean)
          .join(" · ") || "—"}
      </div>
      <div className="col-span-3 flex items-center gap-2">
        <select
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="flex-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-xs outline-none focus:border-brand-coral"
        >
          <option value="">Seleccionar…</option>
          {groupByCountry(churches).map(([country, list]) => (
            <optgroup key={country} label={country}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` — ${c.city}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={!selection || pending}
          className="rounded-md bg-brand-coral px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {pending ? "…" : "Asignar"}
        </button>
      </div>
    </div>
  );
}

function groupByCountry(
  churches: ChurchOption[],
): Array<[string, ChurchOption[]]> {
  const groups = new Map<string, ChurchOption[]>();
  for (const c of churches) {
    const key = c.country?.trim() || "Otros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.entries());
}
