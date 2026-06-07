import { redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /signup queda deprecated. Política DAP: no se permite signup directo
 * sin intención de pago. Todo registro nuevo debe pasar por el
 * onboarding modal en / (home) que combina signup + checkout en una
 * sola transacción. Esto previene cuentas huérfanas.
 *
 * Antes redireccionaba a `/` y el modal NO se abría — el alumno aterrizaba
 * en el home sin entender qué hacer. Bug detectado en E2E jun-2026.
 *
 * Ahora redirige a `/?open=signup` que el OnboardingProvider intercepta
 * y abre el modal automáticamente. Preserva bookmarks, links externos y
 * el deep linking funciona.
 */

export const metadata: Metadata = {
  title: "Inscripción al DAP",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  redirect("/?open=signup");
}
