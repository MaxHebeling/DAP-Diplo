import Link from "next/link";
import { ArrowRight, LayoutDashboard, Shield, Sparkles } from "lucide-react";

import { DapCard, DapCardDescription, DapCardHeader, DapCardTitle } from "@/components/ui-dap/card";

export const metadata = { title: "DAP — Layouts (dev)" };

const LAYOUTS = [
  {
    href: "/dev/layouts/public",
    title: "Public layout",
    description: "Header sticky transparente que se vuelve opaco al scroll + footer oscuro con valores.",
    icon: Sparkles,
  },
  {
    href: "/dev/layouts/student",
    title: "Student layout",
    description: "Sidebar 260px con logo + nav + perfil + rango + topbar con search.",
    icon: LayoutDashboard,
  },
  {
    href: "/dev/layouts/admin",
    title: "Admin layout",
    description: "Variante sobria del sidebar (sin gradientes ni glow). Nav admin.",
    icon: Shield,
  },
];

export default function LayoutsIndexPage() {
  return (
    <div className="min-h-screen bg-surface-base font-inter text-text-primary">
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-violet">
            DAP · Layouts · dev
          </p>
          <h1 className="gradient-text font-grotesk text-display font-bold leading-none">
            Layouts
          </h1>
          <p className="max-w-2xl text-text-secondary">
            Previews de los layouts en uso. Cada uno se renderiza con placeholders
            de contenido para evaluar densidad, jerarquía y consistencia.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LAYOUTS.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="block">
              <DapCard className="h-full transition-colors hover:border-brand-violet/30">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <DapCardHeader>
                  <DapCardTitle>{title}</DapCardTitle>
                  <DapCardDescription>{description}</DapCardDescription>
                </DapCardHeader>
                <span className="mt-4 inline-flex items-center gap-1 font-inter text-sm text-brand-coral">
                  Ver preview <ArrowRight className="size-3.5" />
                </span>
              </DapCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
