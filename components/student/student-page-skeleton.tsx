import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton genérico de una página del student. Imita la estructura del
 * DapStudentShell (sidebar lg + topbar + main) sin requerir auth ni RPC,
 * así loading.tsx puede mostrarlo sin Suspense boundary externo.
 */
export function StudentPageSkeleton({
  variant = "default",
}: {
  /** title prop reservada para futura UX (e.g. cabecera del skeleton). */
  title?: string;
  variant?: "default" | "dashboard" | "fases" | "progreso" | "player";
}) {
  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      {/* Sidebar desktop placeholder */}
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex-1 space-y-1 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="border-t border-white/[0.06] p-4">
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-surface-base/85 px-4 backdrop-blur-xl sm:px-6">
          <Skeleton className="size-9 rounded-md lg:hidden" />
          <Skeleton className="h-5 w-32" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            {variant === "dashboard" && <DashboardSkeleton />}
            {variant === "fases" && <FasesSkeleton />}
            {variant === "progreso" && <ProgresoSkeleton />}
            {variant === "player" && <PlayerSkeleton />}
            {variant === "default" && <DefaultSkeleton />}
          </div>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-white/[0.08] bg-surface-base/95 backdrop-blur-xl lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>
      {/* Module card destacado */}
      <Skeleton className="h-44 w-full rounded-2xl" />
      {/* Progress */}
      <Skeleton className="h-28 w-full rounded-xl" />
      {/* Past + Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function FasesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ProgresoSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-3 overflow-x-auto py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-full" />
        ))}
      </div>
      {/* Video placeholder */}
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
