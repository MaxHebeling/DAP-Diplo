import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Building2,
  Coins,
  Cpu,
  Crown,
  Globe2,
  Heart,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

type PhaseRow = {
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  dimension: { name: string } | null;
  modules: { count: number }[] | null;
};

const ICON_BY_ORDER: Record<number, LucideIcon> = {
  1: BookOpen,
  2: Heart,
  3: Crown,
  4: Sparkles,
  5: ShieldCheck,
  6: Coins,
  7: Briefcase,
  8: Cpu,
  9: Globe2,
};

export async function PhasesGridV2() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select(
      "order_index, slug, title, subtitle, dimension:dimensions(name), modules(count)",
    )
    .eq("published", true)
    .order("order_index", { ascending: true })
    .returns<PhaseRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las fases: ${error.message}`);
  }

  const phases = data ?? [];

  return (
    <section
      id="bloques"
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <LiveFlame />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Los 9 bloques
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Nueve dimensiones de la <span className="gradient-text">unción apostólica</span>
            </h2>
          </div>
          <p className="max-w-md text-justify font-inter text-sm leading-relaxed text-text-secondary">
            Un bloque cada 2 meses académicos. Cada bloque otorga una dimensión
            y prepara para el siguiente. Al final, los 9 forman al líder enviado.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((p) => {
            const Icon = ICON_BY_ORDER[p.order_index] ?? BookOpen;
            const count = p.modules?.[0]?.count ?? 0;
            return (
              <Link
                key={p.slug}
                href={`/fases/${p.slug}`}
                className={cn(
                  "group relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300",
                  "hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet",
                )}
              >
                <div className="mb-4 flex items-start justify-between">
                  <span className="gradient-text font-grotesk text-h2 font-bold leading-none">
                    {String(p.order_index).padStart(2, "0")}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet transition-colors group-hover:bg-brand-violet/20">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </div>
                </div>
                <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                  {p.title}
                </h3>
                {p.subtitle && (
                  <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                    {p.subtitle}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 font-inter text-xs">
                  <span className="font-medium uppercase tracking-wider text-brand-coral">
                    {p.dimension?.name ?? "—"}
                  </span>
                  <span className="text-text-tertiary">{count} módulos</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Llama viva — fondo decorativo. Server-compatible (sin hooks).
// Capas: heat ambient + 3 elipses con flicker + chispas ascendentes.
// Cards solid bg-surface-elevated mantienen legibilidad; la llama
// rebota en gutters, header y zona inferior.
function LiveFlame() {
  const sparks = [
    { left: "45%", delay: 0, duration: 3.2, drift: "-8px" },
    { left: "52%", delay: 0.4, duration: 3.5, drift: "6px" },
    { left: "48%", delay: 0.8, duration: 2.9, drift: "-4px" },
    { left: "55%", delay: 1.2, duration: 3.7, drift: "10px" },
    { left: "47%", delay: 1.6, duration: 3.1, drift: "-12px" },
    { left: "53%", delay: 2.0, duration: 3.4, drift: "5px" },
    { left: "49%", delay: 2.4, duration: 3.6, drift: "-6px" },
    { left: "51%", delay: 0.2, duration: 3.0, drift: "8px" },
    { left: "46%", delay: 1.4, duration: 3.3, drift: "-10px" },
    { left: "54%", delay: 2.8, duration: 3.2, drift: "12px" },
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Heat ambient (oval bajo el centro) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[460px] w-[820px] rounded-full bg-brand-coral/[0.08] blur-[120px]"
        aria-hidden
      />

      {/* Capa exterior: ancha + suave + más blur */}
      <div
        className="dap-flame-base absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[80px]"
        style={{
          width: 620,
          height: 820,
          background:
            "radial-gradient(ellipse 50% 70% at 50% 92%, rgba(255,77,109,0.28), rgba(253,173,90,0.20) 40%, transparent 72%)",
          animation: "dap-flame-flicker 3.6s ease-in-out infinite",
        }}
      />

      {/* Capa media */}
      <div
        className="dap-flame-base absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[50px]"
        style={{
          width: 380,
          height: 620,
          background:
            "radial-gradient(ellipse 45% 70% at 50% 92%, rgba(255,77,109,0.40), rgba(253,173,90,0.28) 50%, transparent 75%)",
          animation: "dap-flame-flicker 2.8s ease-in-out infinite",
          animationDelay: "0.4s",
        }}
      />

      {/* Núcleo brillante */}
      <div
        className="dap-flame-inner absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[30px]"
        style={{
          width: 200,
          height: 420,
          background:
            "radial-gradient(ellipse 40% 70% at 50% 95%, rgba(253,224,71,0.55), rgba(253,173,90,0.40) 50%, transparent 78%)",
          animation: "dap-flame-flicker-inner 2.1s ease-in-out infinite",
        }}
      />

      {/* Chispas ascendentes */}
      {sparks.map((s, i) => (
        <span
          key={i}
          className="dap-spark absolute bottom-0 block size-[3px] rounded-full bg-amber-200"
          style={
            {
              left: s.left,
              boxShadow: "0 0 8px 1px rgba(253,224,71,0.7)",
              animation: `dap-spark-rise ${s.duration}s ease-out infinite`,
              animationDelay: `${s.delay}s`,
              "--spark-drift": s.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
