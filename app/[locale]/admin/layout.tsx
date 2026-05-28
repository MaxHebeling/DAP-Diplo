import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // proxy.ts ya cubre esto, pero defense-in-depth.
    return redirect({ href: "/login?redirectTo=/admin", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return redirect({ href: "/dashboard", locale });
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar fullName={profile.full_name} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
