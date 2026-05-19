import {
  Briefcase,
  Building2,
  Coins,
  Flame,
  GraduationCap,
  Heart,
  type LucideIcon,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { DapRankBadge, type RankOrder } from "@/components/ui-dap/rank-badge";
import { createClient } from "@/lib/supabase/server";

type DimensionRow = {
  order_index: number;
  name: string;
  description: string | null;
};

const ICON_BY_RANK: Record<RankOrder, LucideIcon> = {
  1: GraduationCap, // Discípulo
  2: Heart, // Hijo
  3: Users, // Líder
  4: ShieldCheck, // Pastor
  5: Briefcase, // Administrador
  6: Coins, // Mayordomo
  7: Flame, // Reformador
  8: Building2, // Arquitecto
  9: Send, // Enviado
};

export async function DimensionsTimeline() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dimensions")
    .select("order_index, name, description")
    .order("order_index", { ascending: true })
    .returns<DimensionRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las dimensiones: ${error.message}`);
  }

  const dimensions = data ?? [];

  return (
    <section
      id="dimensiones"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 max-w-3xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Los 9 rangos del Reino
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Discípulo. Hijo. Líder.{" "}
              <span className="gradient-text">Hasta Enviado</span>.
            </h2>
            <p className="mt-6 font-inter text-base leading-relaxed text-text-secondary">
              Cada bloque completado entrega una dimensión ministerial
              verificable. No son títulos honoríficos: son etapas de proceso
              reconocidas dentro del gobierno apostólico del DAP.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          <div
            aria-hidden
            className="absolute left-7 top-4 bottom-4 w-px bg-gradient-to-b from-brand-violet/40 via-white/10 to-brand-coral/40 lg:left-0 lg:right-0 lg:top-10 lg:h-px lg:w-auto lg:bg-gradient-to-r"
          />
          <ol className="grid gap-10 lg:grid-cols-9 lg:gap-4">
            {dimensions.map((r, i) => {
              const order = (r.order_index as RankOrder) ?? 1;
              const Icon = ICON_BY_RANK[order];
              return (
                <Reveal key={r.order_index} delay={i * 0.04}>
                  <li className="relative pl-20 lg:pl-0 lg:text-center">
                    <div className="absolute left-0 top-0 lg:static lg:mx-auto lg:mb-4">
                      <DapRankBadge
                        rankOrder={order}
                        size="md"
                        icon={Icon}
                        label={r.name}
                      />
                    </div>
                    <h3 className="mb-1.5 font-grotesk text-h4 font-semibold text-text-primary lg:text-base">
                      {r.name}
                    </h3>
                    {r.description && (
                      <p className="font-inter text-xs leading-relaxed text-text-tertiary">
                        {r.description.replace(
                          /^Otorgado al completar (la|el) (Fase|Bloque) \d+ — /,
                          "",
                        )}
                      </p>
                    )}
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
