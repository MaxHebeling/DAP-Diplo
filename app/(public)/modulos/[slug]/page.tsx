import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, formatPrice } from "@/lib/format";

type LessonItem = {
  slug: string;
  title: string;
  duration_seconds: number | null;
  is_free_preview: boolean;
  order_index: number;
};

type ModuleDetail = {
  module_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  price_cents: number;
  total_duration_seconds: number;
  lesson_count: number;
  lessons: LessonItem[];
};

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_module_detail", { p_slug: slug });
  const m = (data as ModuleDetail[] | null)?.[0];
  if (!m) return { title: "Módulo no encontrado — DAP" };
  return {
    title: `${m.title} — DAP`,
    description: m.subtitle ?? m.description ?? undefined,
  };
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_module_detail", {
    p_slug: slug,
  });
  if (error) {
    throw new Error(`No se pudo cargar el módulo: ${error.message}`);
  }
  const module_ = (data as ModuleDetail[] | null)?.[0];
  if (!module_) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, status, expires_at")
      .eq("user_id", user.id)
      .eq("module_id", module_.module_id)
      .eq("status", "active")
      .maybeSingle();
    isEnrolled =
      !!enrollment &&
      (enrollment.expires_at === null ||
        new Date(enrollment.expires_at) > new Date());
  }

  const firstLessonSlug = module_.lessons[0]?.slug;

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <nav className="mb-8 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/modulos"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Todos los módulos
          </Link>
        </nav>

        <header className="mb-12 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            {module_.subtitle && (
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand-magenta">
                {module_.subtitle}
              </p>
            )}
            <h1 className="mb-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {module_.title}
            </h1>
            {module_.description && (
              <p className="text-base text-muted-foreground sm:text-lg">
                {module_.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {module_.lesson_count}{" "}
                {module_.lesson_count === 1 ? "lección" : "lecciones"}
              </Badge>
              <span>·</span>
              <span>{formatDuration(module_.total_duration_seconds)}</span>
              <span>·</span>
              <span>{formatPrice(module_.price_cents)}</span>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
            {module_.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={module_.cover_image_url}
                alt={module_.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-brand-coral/20">
                <Logo size="xl" href={null} />
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr]">
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">
              Contenido del módulo
            </h2>
            {module_.lessons.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-card/50 p-6 text-sm text-muted-foreground">
                Aún no hay lecciones publicadas.
              </p>
            ) : (
              <ol className="divide-y rounded-lg border bg-card">
                {module_.lessons.map((l, idx) => (
                  <li
                    key={l.slug}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm">{l.title}</span>
                      {l.is_free_preview && (
                        <Badge className="bg-brand-coral text-brand-coral-foreground hover:bg-brand-coral/90">
                          Vista previa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(l.duration_seconds)}
                      </span>
                      {l.is_free_preview && (
                        <Link
                          href={`/modulos/${module_.slug}/lecciones/${l.slug}`}
                          className="text-xs font-medium text-brand underline-offset-4 hover:underline"
                        >
                          Ver
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <aside>
            <Card className="md:sticky md:top-6">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {formatPrice(module_.price_cents)}
                </CardTitle>
                <CardDescription>
                  {module_.price_cents === 0
                    ? "Acceso permanente sin costo."
                    : "Acceso permanente. Avanza a tu ritmo."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEnrolled ? (
                  firstLessonSlug ? (
                    <Button
                      className="w-full"
                      render={
                        <Link
                          href={`/modulos/${module_.slug}/lecciones/${firstLessonSlug}`}
                        />
                      }
                    >
                      Continuar curso
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      Sin lecciones todavía
                    </Button>
                  )
                ) : user ? (
                  <form
                    action="/api/checkout/create-session"
                    method="POST"
                    className="w-full"
                  >
                    <input
                      type="hidden"
                      name="moduleId"
                      value={module_.module_id}
                    />
                    <Button type="submit" className="w-full">
                      Comprar — {formatPrice(module_.price_cents)}
                    </Button>
                  </form>
                ) : (
                  <Button
                    className="w-full"
                    render={
                      <Link
                        href={`/login?redirectTo=/modulos/${module_.slug}`}
                      />
                    }
                  >
                    Iniciar sesión para comprar
                  </Button>
                )}
                {!user && (
                  <p className="text-center text-xs text-muted-foreground">
                    ¿Sin cuenta?{" "}
                    <Link
                      href={`/signup?redirectTo=/modulos/${module_.slug}`}
                      className="underline underline-offset-4"
                    >
                      Crea una
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
