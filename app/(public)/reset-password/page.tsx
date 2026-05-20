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
import { ResetPasswordRequestForm } from "@/components/auth/reset-password-request-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description:
    "Pedí un link para recuperar tu contraseña del Diplomado Apostólico Pastoral.",
  robots: { index: false, follow: true },
};

export default function ResetPasswordRequestPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recuperar tu contraseña</CardTitle>
            <CardDescription>
              Te mandamos un link a tu email para que puedas crear una nueva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordRequestForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Te acordaste?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Volver a iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
