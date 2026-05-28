import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AdminIndexPage() {
  // Placeholder hasta que construyamos dashboard admin con KPIs.
  const locale = await getLocale();
  redirect({ href: "/admin/fases", locale });
}
