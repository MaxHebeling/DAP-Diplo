import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Coins,
  Cpu,
  Crown,
  GraduationCap,
  Heart,
  Home,
  MessageCircle,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";

import { DapAvatar } from "@/components/ui-dap/avatar";
import { DapBlockCard } from "@/components/ui-dap/block-card";
import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardGlass,
  DapCardGradientBorder,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapInputField } from "@/components/ui-dap/input-field";
import { DapModuleCard } from "@/components/ui-dap/module-card";
import { DapNavItem } from "@/components/ui-dap/nav-item";
import { DapProgressBar } from "@/components/ui-dap/progress-bar";
import { DapRankBadge, type RankOrder } from "@/components/ui-dap/rank-badge";
import { DapStat } from "@/components/ui-dap/stat";

export const metadata = { title: "DAP — Componentes ui-dap (dev)" };

const RANKS: { order: RankOrder; name: string }[] = [
  { order: 1, name: "Discípulo" },
  { order: 2, name: "Hijo" },
  { order: 3, name: "Líder" },
  { order: 4, name: "Pastor" },
  { order: 5, name: "Administrador" },
  { order: 6, name: "Mayordomo" },
  { order: 7, name: "Reformador" },
  { order: 8, name: "Arquitecto" },
  { order: 9, name: "Enviado" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-white/10 pb-2 font-grotesk text-h3 font-semibold text-text-primary">
      {children}
    </h2>
  );
}

export default function ComponentsDevPage() {
  return (
    <div className="min-h-screen bg-surface-base font-inter text-text-primary">
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-violet">
            DAP · ui-dap · dev
          </p>
          <h1 className="gradient-text font-grotesk text-display font-bold leading-none">
            Componentes
          </h1>
          <p className="max-w-2xl text-text-secondary">
            QA visual de los componentes base (Fase B). Cada uno se usa con
            tokens del design system v2.
          </p>
        </header>

        {/* Buttons */}
        <section>
          <SectionHeading>Buttons</SectionHeading>
          <div className="space-y-6 rounded-xl border border-white/10 bg-surface-elevated p-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-text-secondary">Variants</p>
              <div className="flex flex-wrap items-center gap-3">
                <DapButton variant="primary">
                  Empezar ahora <ArrowRight />
                </DapButton>
                <DapButton variant="secondary">Ver detalles</DapButton>
                <DapButton variant="ghost">Saber más</DapButton>
                <DapButton variant="primary" disabled>
                  Disabled
                </DapButton>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-text-secondary">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <DapButton size="sm">Small</DapButton>
                <DapButton size="md">Medium</DapButton>
                <DapButton size="lg">Large</DapButton>
              </div>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section>
          <SectionHeading>Cards</SectionHeading>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DapCard>
              <DapCardHeader>
                <DapCardTitle>Card estándar</DapCardTitle>
                <DapCardDescription>
                  Fondo surface-elevated, borde sutil, sombra card.
                </DapCardDescription>
              </DapCardHeader>
              <p className="text-sm text-text-secondary">
                Contenido del cuerpo. Inter regular 14px.
              </p>
            </DapCard>

            <DapCardGlass>
              <DapCardHeader>
                <DapCardTitle>Card.Glass</DapCardTitle>
                <DapCardDescription>
                  Glassmorphism: bg blanco 3% + blur xl.
                </DapCardDescription>
              </DapCardHeader>
              <p className="text-sm text-text-secondary">
                Ideal sobre fondos con gradiente o imagen.
              </p>
            </DapCardGlass>

            <DapCardGradientBorder>
              <DapCardHeader>
                <DapCardTitle>Borde gradiente</DapCardTitle>
                <DapCardDescription>
                  Pseudo-borde sutil con gradient-brand.
                </DapCardDescription>
              </DapCardHeader>
              <p className="text-sm text-text-secondary">
                Reservada para cards destacadas (pricing, hero secundario).
              </p>
            </DapCardGradientBorder>
          </div>
        </section>

        {/* Stats */}
        <section>
          <SectionHeading>Stats (KPIs)</SectionHeading>
          <div className="grid grid-cols-1 gap-6 rounded-xl border border-white/10 bg-surface-elevated p-6 sm:grid-cols-3">
            <DapStat icon={BookOpen} value="200" label="Módulos" />
            <DapStat icon={GraduationCap} value="18 meses" label="Duración" accent="coral" />
            <DapStat icon={Users} value="+12K" label="Pastores formados" accent="amber" />
          </div>
        </section>

        {/* Progress */}
        <section>
          <SectionHeading>ProgressBar</SectionHeading>
          <div className="space-y-6 rounded-xl border border-white/10 bg-surface-elevated p-6">
            <DapProgressBar value={25} label="Mes 5 · Bloque 3" />
            <DapProgressBar value={67} label="Mes 12 · Bloque 6" />
            <DapProgressBar value={100} label="Diplomado completo" />
            <DapProgressBar value={42} showPercentage={false} />
          </div>
        </section>

        {/* Rank badges */}
        <section>
          <SectionHeading>RankBadge (9 rangos)</SectionHeading>
          <div className="space-y-8 rounded-xl border border-white/10 bg-surface-elevated p-6">
            <div>
              <p className="mb-4 text-sm font-medium text-text-secondary">
                Todos los rangos (size: md)
              </p>
              <div className="flex flex-wrap items-center gap-6">
                {RANKS.map((r) => (
                  <div key={r.order} className="flex flex-col items-center gap-2">
                    <DapRankBadge rankOrder={r.order} label={r.name} />
                    <p className="text-xs text-text-tertiary">{r.name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-text-secondary">Tamaños</p>
              <div className="flex flex-wrap items-end gap-6">
                <DapRankBadge rankOrder={5} size="sm" />
                <DapRankBadge rankOrder={5} size="md" />
                <DapRankBadge rankOrder={5} size="lg" />
                <DapRankBadge rankOrder={5} size="xl" />
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-text-secondary">
                Con icono (Lucide)
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <DapRankBadge rankOrder={1} size="lg" icon={Sparkles} />
                <DapRankBadge rankOrder={4} size="lg" icon={Heart} />
                <DapRankBadge rankOrder={7} size="lg" icon={Crown} />
                <DapRankBadge rankOrder={9} size="lg" icon={ShieldCheck} />
              </div>
            </div>
          </div>
        </section>

        {/* NavItem */}
        <section>
          <SectionHeading>NavItem (sidebar)</SectionHeading>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-surface-elevated p-4">
              <p className="mb-3 px-2 text-xs font-medium uppercase tracking-widest text-text-tertiary">
                Sidebar example
              </p>
              <nav className="flex flex-col gap-1">
                <DapNavItem icon={Home} label="Inicio" href="#" active />
                <DapNavItem icon={BookOpen} label="Mis Módulos" href="#" />
                <DapNavItem icon={GraduationCap} label="Mi Progreso" href="#" />
                <DapNavItem
                  icon={MessageCircle}
                  label="Comunidad"
                  href="#"
                  badge={
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-coral px-1.5 text-[10px] font-bold text-white">
                      3
                    </span>
                  }
                />
                <DapNavItem icon={Bell} label="Notificaciones" href="#" />
                <DapNavItem icon={Settings} label="Configuración" href="#" />
              </nav>
            </div>
            <div className="rounded-xl border border-white/10 bg-surface-elevated p-6">
              <p className="mb-4 text-sm font-medium text-text-secondary">
                Avatares
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <DapAvatar name="Max Hebeling" size="sm" />
                <DapAvatar name="Max Hebeling" size="md" />
                <DapAvatar name="María González Pérez" size="lg" />
                <DapAvatar size="md" />
                <DapAvatar
                  src="/dap-logo.png"
                  name="Logo"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <SectionHeading>InputField</SectionHeading>
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-surface-elevated p-6 md:grid-cols-2">
            <DapInputField
              label="Email"
              type="email"
              placeholder="pastor@iglesia.org"
              hint="Lo usaremos para enviarte tu acceso."
            />
            <DapInputField
              label="Contraseña"
              type="password"
              placeholder="••••••••"
            />
            <DapInputField
              label="Sin label, con placeholder"
              placeholder="Solo placeholder"
            />
            <DapInputField
              label="Estado error"
              defaultValue="email-invalido"
              error="Formato de email inválido."
            />
          </div>
        </section>

        {/* ModuleCard */}
        <section>
          <SectionHeading>ModuleCard</SectionHeading>
          <div className="rounded-xl border border-white/10 bg-surface-elevated p-2">
            <DapModuleCard
              moduleNumber={1}
              title="Fundamentos de la identidad apostólica"
              blockName="Bloque 1 · Fundamentos Espirituales"
              href="#"
              state="approved"
            />
            <DapModuleCard
              moduleNumber={2}
              title="El llamado y la separación"
              blockName="Bloque 1 · Fundamentos Espirituales"
              href="#"
              state="available"
            />
            <DapModuleCard
              moduleNumber={3}
              title="Doctrina y revelación: las dos columnas"
              blockName="Bloque 1 · Fundamentos Espirituales"
              href="#"
              state="available"
            />
            <DapModuleCard
              moduleNumber={4}
              title="Madurez espiritual y disciplinas"
              blockName="Bloque 1 · Fundamentos Espirituales"
              state="locked"
            />
          </div>
        </section>

        {/* BlockCard */}
        <section>
          <SectionHeading>BlockCard (9 bloques)</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DapBlockCard order={1} title="Fundamentos Espirituales" description="Identidad, llamado, doctrina." icon={BookOpen} href="#" />
            <DapBlockCard order={2} title="Identidad y Carácter" description="Formación interior del líder." icon={Heart} href="#" />
            <DapBlockCard order={3} title="Liderazgo y Discipulado" description="Cómo formar a otros." icon={Crown} href="#" />
            <DapBlockCard order={4} title="Ministerio y Pastorado" description="Pastoreo, consejería, oración." icon={Sparkles} href="#" />
            <DapBlockCard order={5} title="Administración y Gobierno" description="Estructura eclesial sana." icon={ShieldCheck} href="#" />
            <DapBlockCard order={6} title="Finanzas y Economía del Reino" description="Mayordomía y prosperidad." icon={Coins} href="#" />
            <DapBlockCard order={7} title="Empresas y Expansión" description="Negocios apostólicos." icon={Rocket} href="#" />
            <DapBlockCard order={8} title="Tecnología, IA y Comunicación" description="Reino en la era digital." icon={Cpu} href="#" />
            <DapBlockCard order={9} title="Gobierno Apostólico y Reforma" description="Reforma de naciones." icon={Building2} href="#" />
          </div>
        </section>

        {/* Extra icons used in design system mapping */}
        <section className="rounded-xl border border-white/10 bg-surface-elevated p-6">
          <p className="mb-4 text-sm font-medium text-text-secondary">
            Mapeo "Formación integral" (6 áreas) — ver DESIGN-SYSTEM.md §4.2
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              { Icon: Sparkles, label: "Espiritual" },
              { Icon: Users, label: "Liderazgo" },
              { Icon: Building2, label: "Administración" },
              { Icon: Coins, label: "Finanzas" },
              { Icon: Briefcase, label: "Empresas" },
              { Icon: Wifi, label: "Tecnología" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                  <Icon className="size-6" strokeWidth={1.8} />
                </div>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 pt-12 text-xs text-text-tertiary">
          Página interna de QA · ui-dap · ver <code className="font-mono">DESIGN-SYSTEM.md §2</code>.
        </footer>
      </div>
    </div>
  );
}
