import { redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /signup queda deprecated. Política DAP: no se permite signup directo
 * sin intención de pago. Todo registro nuevo debe pasar por el
 * onboarding modal en / (home) que combina signup + checkout en una
 * sola transacción. Esto previene cuentas huérfanas.
 *
 * - Bookmark viejo o link externo → redirect a / para arrancar flow correcto
 * - Usuario logueado (no debería entrar acá) → redirect a /dashboard
 * - Usuario con cuenta existente que quiere iniciar sesión → /login
 */

export const metadata: Metadata = {
  title: "Inscripción al DAP",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  redirect("/");
}
