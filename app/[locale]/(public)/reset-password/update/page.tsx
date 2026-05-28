import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return {
    title: t("updatePassword.metaTitle"),
    robots: { index: false, follow: true },
  };
}

export default async function ResetPasswordUpdatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("Auth");

  // Si no hay sesión recovery activa, no podemos setear la contraseña.
  // Esto ocurre si el link del email expiró o ya se usó.
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo size="md" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("updatePassword.expiredTitle")}</CardTitle>
              <CardDescription>
                {t("updatePassword.expiredBody")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/reset-password"
                className="block w-full rounded-md bg-brand-coral px-4 py-2 text-center font-medium text-white hover:bg-brand-coral/90"
              >
                {t("updatePassword.requestNewLink")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("updatePassword.title")}</CardTitle>
            <CardDescription>{t("updatePassword.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
