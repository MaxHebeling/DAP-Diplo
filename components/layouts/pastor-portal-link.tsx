"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Church } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Chip visible SOLO si el user tiene al menos una fila activa en
 * church_pastors. Se muestra en el sidebar del alumno para que los
 * pastores (que en DAP también son alumnos) puedan entrar a su portal
 * sin saber la URL manual /pastor.
 *
 * El chip es NULL para no-pastores → no ocupa espacio ni se renderiza.
 */
export function PastorPortalLink({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "topbar";
}) {
  const [isPastor, setIsPastor] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsPastor(false);
          return;
        }
        // RLS "church_pastors self read" permite al pastor ver sus propias filas
        const { count } = await supabase
          .from("church_pastors")
          .select("id", { count: "exact", head: true })
          .eq("pastor_user_id", user.id)
          .eq("status", "active");
        if (!cancelled) setIsPastor((count ?? 0) > 0);
      } catch {
        if (!cancelled) setIsPastor(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isPastor) return null;

  if (variant === "topbar") {
    return (
      <Link
        href="/pastor"
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-coral/40 bg-brand-coral/10 px-3 py-1.5 font-inter text-xs font-semibold text-brand-coral transition-colors hover:bg-brand-coral/20"
      >
        <Church className="size-3.5" />
        Portal Pastor
      </Link>
    );
  }

  return (
    <Link
      href="/pastor"
      className="mb-3 flex items-center gap-3 rounded-lg border border-brand-coral/30 bg-brand-coral/[0.08] px-3 py-2.5 font-inter text-sm font-semibold text-brand-coral transition-colors hover:bg-brand-coral/15"
    >
      <Church className="size-4 shrink-0" />
      <span>Portal Pastor</span>
    </Link>
  );
}
