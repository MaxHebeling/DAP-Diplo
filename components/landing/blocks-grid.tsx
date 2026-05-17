import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { createClient } from "@/lib/supabase/server";

type BlockRow = {
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  rank: { name: string } | null;
  modules: { count: number }[] | null;
};

export async function BlocksGrid() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .select("order_index, slug, title, subtitle, rank:ranks(name), modules(count)")
    .eq("published", true)
    .order("order_index", { ascending: true })
    .returns<BlockRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar los bloques: ${error.message}`);
  }

  const blocks = data ?? [];

  return (
    <section
      id="bloques"
      className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
                Los 9 Bloques
              </p>
              <h2 className="font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
                Nueve dimensiones de la unción apostólica.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400">
              Un bloque cada 2 meses. Cada bloque otorga un rango y prepara
              para el siguiente. Al final, los 9 forman al líder enviado.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b, i) => {
            const count = b.modules?.[0]?.count ?? 0;
            return (
              <Reveal key={b.slug} delay={i * 0.04}>
                <Link
                  href={`/bloques/${b.slug}`}
                  className="group flex h-full flex-col justify-between gap-8 bg-neutral-950 p-8 transition-colors hover:bg-neutral-900"
                >
                  <div>
                    <div className="mb-8 flex items-start justify-between">
                      <span className="font-serif text-5xl font-semibold text-brand-coral">
                        {String(b.order_index).padStart(2, "0")}
                      </span>
                      <ArrowUpRight
                        className="size-5 text-neutral-600 transition-colors group-hover:text-brand-coral"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="mb-2 font-serif text-2xl font-semibold leading-tight text-neutral-50">
                      {b.title}
                    </h3>
                    {b.subtitle && (
                      <p className="text-sm leading-relaxed text-neutral-400">
                        {b.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-5 text-xs">
                    <span className="font-medium uppercase tracking-wider text-brand-coral">
                      {b.rank?.name ?? "—"}
                    </span>
                    <span className="text-neutral-500">
                      {count} módulos
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
