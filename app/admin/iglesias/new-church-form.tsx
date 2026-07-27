"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createChurchAction } from "./actions";

export function NewChurchForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nombre muy corto.");
      return;
    }
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("country", country.trim());
    fd.set("city", city.trim());
    fd.set("status", "active");
    startTransition(async () => {
      const res = await createChurchAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Iglesia creada.");
      setName("");
      setCountry("");
      setCity("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Nombre
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la iglesia"
          className="w-64 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          País
        </label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Argentina"
          className="w-40 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Ciudad
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Salta"
          className="w-40 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand-coral"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear iglesia"}
      </button>
    </form>
  );
}
