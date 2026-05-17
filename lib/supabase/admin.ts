import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con SERVICE_ROLE_KEY. Bypasea RLS.
 * Usar SOLO en route handlers server-side donde sea estrictamente necesario
 * (ej. webhook de Stripe insertando enrollments tras un pago confirmado).
 * NUNCA importar desde Client Components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
