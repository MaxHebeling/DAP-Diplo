import type { Metadata } from "next";
import Link from "next/link";

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

export const metadata: Metadata = {
  title: "Crear nueva contraseña",
  robots: { index: false, follow: true },
};

export default async function ResetPasswordUpdatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
              <CardTitle>Link expirado o inválido</CardTitle>
              <CardDescription>
                El link de recuperación ya no es válido. Pedí uno nuevo para
                continuar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/reset-password"
                className="block w-full rounded-md bg-brand-coral px-4 py-2 text-center font-medium text-white hover:bg-brand-coral/90"
              >
                Pedir nuevo link
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
            <CardTitle>Creá tu nueva contraseña</CardTitle>
            <CardDescription>
              Tiene que tener al menos 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
