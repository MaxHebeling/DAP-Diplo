"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignPastorToChurchAction, revokePastorFromChurchAction } from "./actions";

type ChurchOption = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
};

type AssignedChurch = {
  relationId: string;
  churchId: string;
  churchName: string;
  isPrimary: boolean;
};

type Pastor = {
  id: string;
  full_name: string;
};

export function PastorAssignRow({
  pastor,
  assignedChurches,
  availableChurches,
}: {
  pastor: Pastor;
  assignedChurches: AssignedChurch[];
  availableChurches: ChurchOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState("");

  function assign() {
    if (!selection) return;
    const fd = new FormData();
    fd.set("pastor_user_id", pastor.id);
    fd.set("church_id", selection);
    fd.set("pastoral_role", "pastor_principal");
    fd.set("is_primary", "true");
    startTransition(async () => {
      const res = await assignPastorToChurchAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Iglesia asignada a ${pastor.full_name}.`);
      setSelection("");
    });
  }

  function revoke(relationId: string, churchName: string) {
    const fd = new FormData();
    fd.set("id", relationId);
    startTransition(async () => {
      const res = await revokePastorFromChurchAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${churchName} desasignada.`);
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-sm">
      <div className="col-span-4 font-medium">{pastor.full_name}</div>
      <div className="col-span-5">
        {assignedChurches.length === 0 ? (
          <span className="text-xs text-text-tertiary">Sin iglesias asignadas</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {assignedChurches.map((c) => (
              <span
                key={c.relationId}
                className="inline-flex items-center gap-1 rounded-md bg-brand-coral/10 px-2 py-0.5 text-xs text-brand-coral"
              >
                {c.churchName}
                {c.isPrimary && <span className="text-[9px] opacity-70">★</span>}
                <button
                  type="button"
                  onClick={() => revoke(c.relationId, c.churchName)}
                  disabled={pending}
                  className="ml-1 text-brand-coral hover:text-red-400"
                  aria-label={`Quitar ${c.churchName}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-3 flex items-center gap-2">
        <select
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="flex-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-xs outline-none focus:border-brand-coral"
        >
          <option value="">+ iglesia…</option>
          {availableChurches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.city ? ` — ${c.city}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={!selection || pending}
          className="rounded-md bg-brand-coral px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {pending ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
