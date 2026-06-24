import { redirect } from "next/navigation";

// /portal es alias de /dashboard. Los emails de bienvenida y las cartas
// de admisión enviadas el 2026-06-23 usaron esta URL — el redirect mantiene
// los links vivos sin necesidad de reenviar.
export default function PortalRedirect() {
  redirect("/dashboard");
}
