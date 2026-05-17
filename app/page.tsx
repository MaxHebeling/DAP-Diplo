import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        DAP
      </p>
      <h1 className="mb-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Diplomado Apostólico para Pastores
      </h1>
      <p className="mb-10 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
        Formación bíblica online para pastores que quieren profundizar en
        doctrina apostólica, a su propio ritmo.
      </p>
      <Button size="lg" render={<Link href="/modulos" />}>
        Ver módulos
      </Button>
    </main>
  );
}
