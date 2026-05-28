import { Skeleton } from "@/components/ui/skeleton";

export default function FaseDetailLoading() {
  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <div className="h-16 border-b" />
      <section className="px-6 pt-32 pb-20">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>
      </section>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
