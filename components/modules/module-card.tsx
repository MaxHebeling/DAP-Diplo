import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/format";

export type ModuleCardData = {
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  price_cents: number;
  totalDurationSeconds: number;
};

export function ModuleCard({ module: m }: { module: ModuleCardData }) {
  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {m.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.cover_image_url}
            alt={m.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            DAP
          </div>
        )}
      </div>

      <CardHeader className="gap-1.5 px-5 pt-5">
        {m.subtitle && (
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {m.subtitle}
          </p>
        )}
        <CardTitle className="text-balance text-lg leading-tight">
          {m.title}
        </CardTitle>
        <CardDescription className="text-sm">
          {formatDuration(m.totalDurationSeconds)} · {formatPrice(m.price_cents)}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-0" />

      <CardFooter className="px-5 pb-5">
        <Button
          className="w-full"
          variant="outline"
          render={<Link href={`/modulos/${m.slug}`} />}
        >
          Ver detalle
        </Button>
      </CardFooter>
    </Card>
  );
}
