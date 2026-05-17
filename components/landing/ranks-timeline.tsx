import { Reveal } from "@/components/landing/reveal";
import { createClient } from "@/lib/supabase/server";

type RankRow = {
  order_index: number;
  name: string;
  description: string | null;
};

export async function RanksTimeline() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranks")
    .select("order_index, name, description")
    .order("order_index", { ascending: true })
    .returns<RankRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar los rangos: ${error.message}`);
  }

  const ranks = data ?? [];

  return (
    <section
      id="rangos"
      className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 max-w-3xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              Los 9 rangos del Reino
            </p>
            <h2 className="font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
              Discípulo. Hijo. Líder. Pastor. Hasta Enviado.
            </h2>
            <p className="mt-6 text-justify text-base leading-relaxed text-neutral-400 hyphens-auto">
              Cada bloque completado entrega un rango ministerial verificable.
              No son títulos honoríficos: son etapas de proceso reconocidas
              dentro del gobierno apostólico del DAP.
            </p>
          </div>
        </Reveal>

        {/* Timeline vertical en mobile, horizontal en desktop */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-brand-coral/40 via-white/10 to-brand-coral/40 lg:left-0 lg:right-0 lg:top-7 lg:h-px lg:w-auto lg:bg-gradient-to-r"
          />
          <ol className="grid gap-10 lg:grid-cols-9 lg:gap-4">
            {ranks.map((r, i) => (
              <Reveal key={r.order_index} delay={i * 0.04}>
                <li className="relative pl-14 lg:pl-0 lg:pt-16">
                  <div className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border border-brand-coral/40 bg-neutral-950 font-serif text-sm font-semibold text-brand-coral lg:left-1/2 lg:-translate-x-1/2">
                    {r.order_index}
                  </div>
                  <h3 className="mb-1.5 font-serif text-xl font-semibold text-neutral-50 lg:text-center lg:text-lg">
                    {r.name}
                  </h3>
                  {r.description && (
                    <p className="text-xs leading-relaxed text-neutral-500 lg:text-center">
                      {r.description.replace(
                        /^Otorgado al completar el Bloque \d+ — /,
                        "",
                      )}
                    </p>
                  )}
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
