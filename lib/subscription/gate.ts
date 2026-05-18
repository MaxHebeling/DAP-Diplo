import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate genérico para áreas student que requieren suscripción activa
 * (comunidad, en-vivo, certificados…). El middleware ya cubre la parte
 * "auth obligatoria" para PROTECTED_PREFIXES; aquí añadimos el check
 * RPC has_active_subscription. Admin override siempre permitido.
 */
export async function requireActiveSubscription(
  redirectFromPath: string,
): Promise<{ userId: string; isAdmin: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectFromPath)}`);
  }

  const [{ data: profile }, { data: activeSub }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("has_active_subscription"),
  ]);
  const isAdmin = profile?.role === "admin";
  if (!isAdmin && !activeSub) {
    redirect(`/suscribirme?toast=needs-active-sub`);
  }
  return { userId: user.id, isAdmin };
}
