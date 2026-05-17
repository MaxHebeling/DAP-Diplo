import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader, type HeaderUser } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/format";

type ModuleRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  duration_minutes: number | null;
};

type RankRef = {
  name: string;
  order_index: number;
} | null;

type BlockDetail = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  months_duration: number;
  published: boolean;
  rank: RankRef;
  modules: ModuleRow[] | null;
};

type NeighborBlock = {
  slug: string;
  order_index: number;
  title: string;
};

type PageProps = { params: Promise<{ slug: string }> };

// Pre-renderiza los 9 slugs publicados al build.
// (dynamicParams = true por default → admins pueden previsualizar
// bloques no publicados via render on-demand.)
// Usa un cliente Supabase plano (sin cookies) porque generateStaticParams
// corre al build sin contexto HTTP — createClient de @/lib/supabase/server
// invocaría cookies() y rompería.
export async function generateStaticParams() {
  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await supabase
    .from("blocks")
    .select("slug")
    .eq("published", true)
    .order("order_index", { ascending: true });
  return (data ?? []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("title, subtitle, description")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) return { title: "Bloque no encontrado — DAP" };
  return {
    title: `${data.title} — DAP`,
    description: data.subtitle ?? data.description ?? undefined,
  };
}

export default async function BlockDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Bloque + rango + módulos en una sola query (sin filtrar published acá
  // para permitir admin bypass más abajo).
  const { data: block, error } = await supabase
    .from("blocks")
    .select(
      `id, order_index, slug, title, subtitle, description, cover_image_url,
       months_duration, published,
       rank:ranks(name, order_index),
       modules(id, order_index, slug, title, subtitle, duration_minutes)`,
    )
    .eq("slug", slug)
    .maybeSingle<BlockDetail>();

  if (error) {
    throw new Error(`No se pudo cargar el bloque: ${error.message}`);
  }
  if (!block) notFound();

  // Sesión del visitante (también pinta el header con su avatar/role).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      headerUser = {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      };
      isAdmin = profile.role === "admin";
    }
  }

  // Gate: bloque no publicado → 404 a no ser que sea admin.
  if (!block.published && !isAdmin) {
    notFound();
  }

  // Supabase no ordena el embed por defecto.
  const modules = [...(block.modules ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  // Vecinos prev/next entre los 9 bloques publicados.
  const { data: allBlocks } = await supabase
    .from("blocks")
    .select("slug, order_index, title")
    .eq("published", true)
    .order("order_index", { ascending: true })
    .returns<NeighborBlock[]>();

  const list = allBlocks ?? [];
  const here = list.findIndex((b) => b.order_index === block.order_index);
  const prev: NeighborBlock | null = here > 0 ? list[here - 1] : null;
  const next: NeighborBlock | null =
    here >= 0 && here < list.length - 1 ? list[here + 1] : null;

  const totalMinutes = modules.reduce(
    (sum, m) => sum + (m.duration_minutes ?? 50),
    0,
  );

  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <SiteHeader user={headerUser} />
      <main className="flex flex-1 flex-col">
        {/* HERO */}
        <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-36 sm:pb-24">
          {block.cover_image_url ? (
            <Image
              src={block.cover_image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-20 object-cover opacity-30"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950 via-neutral-950/50 to-neutral-950" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-96 bg-[radial-gradient(45%_55%_at_50%_30%,rgba(253,173,90,0.14),transparent)]"
          />

          <div className="mx-auto max-w-5xl px-6">
            <Reveal>
              <Link
                href="/#bloques"
                className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-brand-coral"
              >
                <ArrowLeft className="size-4" />
                Volver a los bloques
              </Link>

              {!block.published && (
                <Badge className="mb-6 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20">
                  Preview admin — bloque sin publicar
                </Badge>
              )}

              <p className="mb-2 font-serif text-7xl font-semibold leading-none text-brand-coral sm:text-8xl">
                {String(block.order_index).padStart(2, "0")}
              </p>
              {block.subtitle && (
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-brand-coral">
                  {block.subtitle}
                </p>
              )}
              <h1 className="mb-7 font-serif text-balance text-5xl font-semibold leading-[1.05] text-neutral-50 sm:text-6xl">
                {block.title}
              </h1>
              {block.description && (
                <p className="mb-10 max-w-3xl text-justify text-lg leading-relaxed text-neutral-300 hyphens-auto">
                  {block.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-400">
                <Badge
                  variant="secondary"
                  className="bg-white/5 text-neutral-200"
                >
                  {modules.length}{" "}
                  {modules.length === 1 ? "módulo" : "módulos"}
                </Badge>
                <span className="text-neutral-700">·</span>
                <span>
                  {block.months_duration}{" "}
                  {block.months_duration === 1 ? "mes" : "meses"}
                </span>
                {totalMinutes > 0 && (
                  <>
                    <span className="text-neutral-700">·</span>
                    <span>{formatDuration(totalMinutes * 60)} de contenido</span>
                  </>
                )}
                {block.rank && (
                  <>
                    <span className="text-neutral-700">·</span>
                    <Badge className="bg-brand-coral text-brand-coral-foreground hover:bg-brand-coral/90">
                      Rango: {block.rank.name}
                    </Badge>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ¿QUÉ APRENDERÁS? */}
        <section className="border-t border-white/5 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
                ¿Qué aprenderás?
              </p>
              <h2 className="mb-10 font-serif text-balance text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl">
                Los objetivos clave de este bloque.
              </h2>
              <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 sm:p-10">
                <p className="text-justify text-sm leading-relaxed text-neutral-400 hyphens-auto">
                  El detalle de objetivos de aprendizaje, palabras clave del
                  bloque y entregables esperados se editan desde el panel
                  administrativo. Cada bloque tendrá aquí su descripción
                  curricular completa antes del lanzamiento público.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* MÓDULOS DEL BLOQUE — lista no clickeable */}
        <section className="border-t border-white/5 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
                Módulos de este bloque
              </p>
              <h2 className="mb-12 font-serif text-balance text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl">
                {modules.length}{" "}
                {modules.length === 1 ? "clase" : "clases"} de 45–60 min cada
                una.
              </h2>
            </Reveal>

            {modules.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                Este bloque aún no tiene módulos publicados.
              </p>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-2">
                {modules.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/30 px-5 py-4 transition-colors hover:border-white/10"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 font-serif text-sm font-medium text-neutral-300">
                      {String(m.order_index).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-50">
                        {m.title}
                      </p>
                      {m.subtitle && (
                        <p className="truncate text-xs text-neutral-500">
                          {m.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                      ≈{m.duration_minutes ?? 50} min
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* CTA grande coral */}
        <section className="bg-brand-coral px-6 py-24 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -z-10 h-96 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.16),transparent)]"
          />
          <div className="mx-auto max-w-3xl text-center text-brand-coral-foreground">
            <Reveal>
              <h2 className="mb-5 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                Suscríbete para acceder a este bloque.
              </h2>
              <p className="mb-10 text-balance text-base sm:text-lg">
                $25 USD/mes. Acceso al contenido grabado, las sesiones en vivo y
                la mentoría grupal. Cancela cuando quieras.
              </p>
              <Button
                size="lg"
                className="h-12 bg-neutral-950 px-8 text-base font-medium text-neutral-50 hover:bg-neutral-900"
                render={<Link href="/suscribirme" />}
              >
                Suscribirme — $25/mes
              </Button>
            </Reveal>
          </div>
        </section>

        {/* PREV / NEXT */}
        {(prev || next) && (
          <nav
            aria-label="Navegación entre bloques"
            className="border-t border-white/5 px-6 py-16"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:justify-between">
              {prev ? (
                <Link
                  href={`/bloques/${prev.slug}`}
                  className="group flex flex-col gap-1 rounded-xl border border-white/5 bg-neutral-900/30 px-6 py-5 transition-colors hover:border-brand-coral/30"
                >
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                    <ArrowLeft className="size-3.5" />
                    Bloque {String(prev.order_index).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-lg font-medium text-neutral-50 group-hover:text-brand-coral">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/bloques/${next.slug}`}
                  className="group flex flex-col items-end gap-1 rounded-xl border border-white/5 bg-neutral-900/30 px-6 py-5 transition-colors hover:border-brand-coral/30"
                >
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                    Bloque {String(next.order_index).padStart(2, "0")}
                    <ArrowRight className="size-3.5" />
                  </span>
                  <span className="font-serif text-lg font-medium text-neutral-50 group-hover:text-brand-coral">
                    {next.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </nav>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
