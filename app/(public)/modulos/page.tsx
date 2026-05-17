import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModuleCard, type ModuleCardData } from "@/components/modules/module-card";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Módulos — DAP",
  description:
    "Módulos del Diplomado Apostólico para Pastores. Compra los que te interesen y avanza a tu ritmo.",
};

type ModuleListing = {
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  price_cents: number;
  order_index: number;
  total_duration_seconds: number;
  lesson_count: number;
};

export default async function ModulosPage() {
  const supabase = await createClient();

  // RPC con security definer: agrega duración total de TODAS las lecciones
  // del módulo sin exponer mux_playback_id (la RLS de lessons bloquea
  // lecciones no-free-preview para anon/no-inscritos, lo que impedía sumar
  // desde un embed). Ver supabase/migrations/0002_modules_listing_function.sql
  const { data, error } = await supabase.rpc("list_published_modules");

  if (error) {
    throw new Error(`No se pudieron cargar los módulos: ${error.message}`);
  }

  const modules = (data ?? []) as ModuleListing[];

  const items: ModuleCardData[] = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    subtitle: m.subtitle,
    cover_image_url: m.cover_image_url,
    price_cents: m.price_cents,
    totalDurationSeconds: m.total_duration_seconds,
  }));

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-12 flex flex-col items-center text-center">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="mb-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Módulos del diplomado
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            Compra los módulos que te interesen y avanza a tu ritmo. Cada uno
            incluye videos, recursos descargables y un examen final con
            certificado.
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <ModuleCard key={m.slug} module={m} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-dashed bg-card/50 px-8 py-16 text-center">
      <div className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Próximamente
      </div>
      <h2 className="mb-2 text-lg font-semibold">Aún no hay módulos publicados</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Estamos preparando el primer módulo. Vuelve pronto o crea tu cuenta
        para enterarte cuando esté disponible.
      </p>
      <Button variant="outline" render={<Link href="/signup" />}>
        Crear cuenta
      </Button>
    </div>
  );
}
