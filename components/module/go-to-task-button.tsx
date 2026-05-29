"use client";

import { ArrowRight } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";

/**
 * Botón "Ir a Tarea" del footer del módulo.
 *
 * Forzar navegación + scroll es necesario porque cambiar solo el
 * query param (`?section=activation`) no dispara scroll natural y el
 * usuario quedaba viendo el footer sin notar el cambio.
 *
 * Estrategia: si ya estamos en la URL destino (mismo path + ?section=activation),
 * solo scrolleamos al top del contenido. Si no, navegamos con router.push y,
 * en el next tick, hacemos scroll al stepper section.
 */
export function GoToTaskButton({
  phaseSlug,
  moduleSlug,
}: {
  phaseSlug: string;
  moduleSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const targetPath = `/fases/${phaseSlug}/modulos/${moduleSlug}`;
  const targetUrl = `${targetPath}?section=activation`;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const scrollToHeading = () => {
      const el = document.getElementById("section-heading");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (pathname === targetPath) {
      // Mismo módulo — solo actualizamos el query y scrolleamos
      router.push(targetUrl, { scroll: false });
      requestAnimationFrame(() => requestAnimationFrame(scrollToHeading));
    } else {
      router.push(targetUrl);
      requestAnimationFrame(() => requestAnimationFrame(scrollToHeading));
    }
  }

  return (
    <a
      href={targetUrl}
      onClick={handleClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-coral px-4 py-2 font-inter text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
    >
      Ir a Tarea
      <ArrowRight className="size-3.5" />
    </a>
  );
}
