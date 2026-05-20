import { Skeleton } from "@/components/ui/skeleton";

export default function ModulePlayerLoading() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]">
      <aside className="hidden border-r bg-card/40 p-5 lg:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-6 w-48" />
        <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-3 border-b px-4 sm:px-6">
          <Skeleton className="h-4 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="size-8 rounded" />
            <Skeleton className="size-8 rounded" />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-3 overflow-x-auto py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-full" />
              ))}
            </div>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </main>
      </div>
    </div>
  );
}
