import Link from "next/link";
import { ArrowRight, Settings, Sparkles } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { DapStudentShell } from "@/components/layouts/dap-student-shell";
import { DapButton } from "@/components/ui-dap/button";
import { PushSubscribeButton } from "@/components/pwa/push-subscribe-button";

export const metadata = { title: "Configuración — DAP" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/configuracion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DapStudentShell
      userName={profile?.full_name ?? "Alumno"}
      userAvatar={profile?.avatar_url ?? null}
      title="Configuración"
      onSignOut={signOutAction}
    >
      <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <header>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-coral/30 bg-brand-coral/[0.06] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              <Sparkles className="size-3" />
              Tu cuenta
            </p>
            <h1 className="mt-3 font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Configuración
            </h1>
            <p className="mt-2 font-inter text-base text-text-secondary">
              Preferencias de tu cuenta y notificaciones.
            </p>
          </header>

          {/* Notificaciones push */}
          <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6">
            <h2 className="font-grotesk text-lg font-semibold text-text-primary">
              Notificaciones
            </h2>
            <p className="mt-1 font-inter text-sm text-text-secondary">
              Activá las notificaciones del navegador para recibir un aviso
              cada martes cuando abra tu nuevo módulo, y cuando llegue tu
              corrección semanal del Ap. Max.
            </p>
            <div className="mt-4">
              <PushSubscribeButton />
            </div>
          </section>

          {/* Contraseña */}
          <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6">
            <h2 className="font-grotesk text-lg font-semibold text-text-primary">
              Contraseña
            </h2>
            <p className="mt-1 font-inter text-sm text-text-secondary">
              Si quieres cambiarla, te mandamos un link a tu email.
            </p>
            <div className="mt-4">
              <DapButton
                variant="secondary"
                size="sm"
                render={<Link href="/reset-password" />}
              >
                Cambiar contraseña
                <ArrowRight />
              </DapButton>
            </div>
          </section>

          {/* Soporte */}
          <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                <Settings className="size-5" strokeWidth={1.7} />
              </div>
              <div>
                <h2 className="font-grotesk text-lg font-semibold text-text-primary">
                  Más configuración pronto
                </h2>
                <p className="mt-1 font-inter text-sm text-text-secondary">
                  Próximamente: editar perfil, gestionar suscripción, idioma
                  y zona horaria, opciones de privacidad.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DapStudentShell>
  );
}
