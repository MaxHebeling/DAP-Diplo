import { Skeleton } from "@/components/ui/skeleton";

export default function AdmisionesLoading() {
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-96" />
        </header>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="ml-auto h-9 w-72 rounded-md" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    </main>
  );
}
