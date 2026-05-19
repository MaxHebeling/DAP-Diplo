import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Compass,
  Cpu,
  Sparkles,
} from "lucide-react";

const VALUES = [
  { icon: BookOpen, label: "Bíblico" },
  { icon: Briefcase, label: "Práctico" },
  { icon: Compass, label: "Estratégico" },
  { icon: Cpu, label: "Tecnológico" },
  { icon: Sparkles, label: "Apostólico" },
];

const COLS = [
  {
    title: "Programa",
    links: [
      { href: "#bloques", label: "Los 9 bloques" },
      { href: "#modelo", label: "Modelo mensual" },
      { href: "#rangos", label: "Rangos y certificaciones" },
      { href: "/suscribirme", label: "Empezar ahora" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { href: "#preguntas", label: "Preguntas frecuentes" },
      { href: "/login", label: "Iniciar sesión" },
      { href: "mailto:hola@dap.tudominio", label: "Contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terminos", label: "Términos" },
      { href: "/privacidad", label: "Privacidad" },
    ],
  },
];

export function DapPublicFooter() {
  return (
    <footer
      data-slot="dap-public-footer"
      className="border-t border-white/[0.08] bg-surface-base text-text-primary"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/dap-logo-white.png"
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-md"
              />
              <span className="font-grotesk text-xl font-bold tracking-tight">
                DAP
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              Diplomado Apostólico Pastoral. Formación integral de 18 meses
              para pastores y líderes hispanohablantes.
            </p>
            <ul className="flex flex-wrap gap-2">
              {VALUES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-text-secondary"
                >
                  <Icon
                    className="size-3.5 text-brand-violet"
                    strokeWidth={2}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 font-grotesk text-sm font-semibold uppercase tracking-widest text-text-tertiary">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-inter text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DAP. Todos los derechos reservados.</p>
          <p>
            Construido con propósito ·{" "}
            <span className="gradient-text font-semibold">Apostólico + Tech</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
