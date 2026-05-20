import { cn } from "@/lib/utils";

/**
 * Skeleton block con pulse animation para placeholders de loading state.
 * Usar para rellenar cards / textos mientras la query del Server Component
 * resuelve (junto con loading.tsx).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/[0.06]",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}
