import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate de página: requiere usuario autenticado + suscripción activa o admin.
 * El middleware ya valida login para /comunidad — aquí añadimos el check
 * de suscripción (no replicable en middleware con RPC sin coste extra).
 */
export async function requireForumAccess(redirectFromPath: string): Promise<{
  userId: string;
  isAdmin: boolean;
}> {
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
    redirect(`/suscribirme?toast=community-needs-sub`);
  }
  return { userId: user.id, isAdmin };
}
