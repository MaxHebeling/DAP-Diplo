import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8">
        <Logo size="xl" href={null} priority />
      </div>
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand-magenta">
        Diplomado Apostólico Pastoral
      </p>
      <h1 className="mb-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Formación integral para pastores y líderes apostólicos
      </h1>
      <p className="mb-10 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
        18 meses · 9 bloques · 200 módulos. Espiritualidad, liderazgo, gobierno,
        finanzas, empresas y tecnología. Acceso por suscripción mensual con
        contenido grabado, sesiones en vivo y mentoría.
      </p>
      <Button size="lg" render={<Link href="/signup" />}>
        Comenzar mi diplomado
      </Button>
    </main>
  );
}
