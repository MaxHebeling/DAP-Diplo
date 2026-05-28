import { Skeleton } from "@/components/ui/skeleton";

export default function AdmisionLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-base text-text-primary">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-20">
        <header className="mb-12 space-y-4 text-center">
          <Skeleton className="mx-auto size-14 rounded-lg" />
          <Skeleton className="mx-auto h-3 w-48" />
          <Skeleton className="mx-auto h-10 w-72" />
          <Skeleton className="mx-auto h-5 w-96" />
        </header>
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
