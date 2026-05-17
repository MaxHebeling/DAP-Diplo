import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ModulosPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Módulos
      </h1>
      <p className="mb-10 max-w-xl text-muted-foreground">
        Placeholder — el listado real se implementa en el prompt 1.2 (Fase 1).
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Volver al inicio
      </Button>
    </main>
  );
}
