import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Diplomado",
    links: [
      { label: "El programa", href: "#diplomado" },
      { label: "Los 9 fases", href: "#fases" },
      { label: "Dimensiones", href: "#dimensiones" },
      { label: "Preguntas", href: "#faq" },
    ],
  },
  {
    title: "Estudia",
    links: [
      { label: "Inscribirme", href: "/signup" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Mi dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Comunidad", href: "#" },
      { label: "Soporte", href: "#" },
      { label: "Contacto", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos", href: "#" },
      { label: "Privacidad", href: "#" },
      { label: "Política de reembolso", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-neutral-950 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo size="md" variant="light" />
            <p className="mt-5 max-w-xs text-justify text-sm leading-relaxed text-neutral-400 hyphens-auto">
              Diplomado Apostólico Pastoral. Formación integral de 18 meses
              para pastores y líderes hispanohablantes.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-5 text-xs font-medium uppercase tracking-widest text-neutral-500">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-neutral-300 transition-colors hover:text-neutral-50"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-8 text-xs text-neutral-500 sm:flex-row sm:items-center">
          <p>© 2026 DAP — Diplomado Apostólico Pastoral. Todos los derechos reservados.</p>
          <p>Hecho con propósito.</p>
        </div>
      </div>
    </footer>
  );
}
