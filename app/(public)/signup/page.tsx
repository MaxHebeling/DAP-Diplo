import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock, ArrowLeft, GraduationCap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";

export const metadata: Metadata = {
  title: "Crea tu cuenta",
  description: "Únete al Diplomado Apostólico Pastoral. $25 USD/mes.",
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  if (!isEnrollmentOpen()) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center space-y-4">
            <Logo size="md" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <CalendarClock className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">
              Inscripciones abren el {ENROLLMENT_OPENS_LABEL}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              La primera convocatoria del Diplomado Apostólico Pastoral
              abre inscripciones el <strong>01 de Junio de 2026</strong>.
              Vuelve en esa fecha para postular tu admisión y asegurar
              tu lugar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-brand-violet/25 bg-brand-violet/[0.06] p-4 text-left">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Inicio de clases:</span>{" "}
                <span className="capitalize text-muted-foreground">
                  {CLASSES_START_LABEL}
                </span>
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-brand-coral hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { redirectTo } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 text-center">
          <Logo size="md" />
          <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
          <CardDescription>
            Acceso permanente a los módulos que compres. Avanza a tu ritmo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
