"use client";

import { Tour, type TourStep } from "./tour";

const STEPS: TourStep[] = [
  {
    title: "Bienvenido al DAP",
    body: "Te llevamos en un tour rápido para que veas todo lo que tenés disponible. Lleva 30 segundos.",
    placement: "center",
  },
  {
    target: '[data-tour="current-module"]',
    title: "Tu módulo de la semana",
    body: "Acá ves el módulo que se abrió este martes. Tenés hasta el lunes 23:59 para entregar la activación.",
    placement: "bottom",
  },
  {
    target: '[data-tour="progress"]',
    title: "Tu progreso",
    body: "Vas a llenar esta barra durante 72 semanas. Al completar los 8 módulos de un bloque, recibís una dimensión.",
    placement: "bottom",
  },
  {
    target: '[data-tour="upcoming"]',
    title: "Lo que viene",
    body: "Los próximos módulos quedan bloqueados hasta su martes. El contenido pasado queda accesible para repaso.",
    placement: "top",
  },
  {
    target: '[data-tour="resources"]',
    title: "Recursos extra",
    body: "Comunidad, sesiones en vivo y tutor IA. Disponibles 24/7.",
    placement: "top",
  },
];

export function DashboardTour() {
  return <Tour steps={STEPS} />;
}
