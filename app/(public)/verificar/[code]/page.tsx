import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Download,
  ShieldX,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { signedCertificateUrl } from "@/lib/certificates/upload";

type PageProps = { params: Promise<{ code: string }> };

type VerifyRow = {
  full_name: string;
  block_order_index: number;
  block_title: string;
  rank_name: string | null;
  issued_at: string;
  pdf_url: string | null;
};

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatIssuedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return {
    title: `Verificación de certificado · ${code} — DAP`,
    description:
      "Verificación oficial de un certificado emitido por el Diplomado Apostólico Pastoral.",
  };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code } = await params;
  // Normaliza el code (los códigos son 8-hex upper). Tolerante a lower-case.
  const normalized = code.trim().toUpperCase();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", {
    p_code: normalized,
  });

  if (error) {
    return <VerificationError code={normalized} reason={error.message} />;
  }
  const rows = (data ?? []) as VerifyRow[];
  const cert = rows[0];
  if (!cert) {
    return <VerificationError code={normalized} />;
  }

  // Signed URL 5 min para descarga / vista del PDF (si ya está subido).
  let signedUrl: string | null = null;
  if (cert.pdf_url) {
    try {
      const admin = createAdminClient();
      // Reusa el helper, pero acepta TTL custom
      void admin; // ya usado vía signedCertificateUrl
      signedUrl = await signedCertificateUrl(cert.pdf_url, 300);
    } catch (err) {
      // Si el PDF aún no se subió o expiró el bucket, no rompemos la página.
      console.error("[verify] signed URL failed:", err);
    }
  }

  const blockN = String(cert.block_order_index).padStart(2, "0");

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-3.5" />
          Inicio
        </Link>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Banner verde */}
          <div className="flex items-center gap-4 border-b bg-emerald-500/10 px-8 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20">
              <BadgeCheck className="size-6 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Certificado verificado
              </p>
              <p className="font-serif text-2xl font-semibold leading-tight text-emerald-900 dark:text-emerald-100">
                Auténtico
              </p>
            </div>
          </div>

          <div className="px-8 py-8 space-y-6">
            <DataRow
              icon={<UserIcon className="size-4" />}
              label="Otorgado a"
              value={cert.full_name}
              big
            />
            <DataRow
              icon={null}
              label="Por completar"
              value={`Fase ${blockN}: ${cert.block_title}`}
            />
            {cert.rank_name && (
              <DataRow
                icon={null}
                label="Dimensión alcanzado"
                value={cert.rank_name}
                emphColor
              />
            )}
            <DataRow
              icon={<CalendarDays className="size-4" />}
              label="Fecha de emisión"
              value={formatIssuedAt(cert.issued_at)}
            />
            <div className="border-t pt-6">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Código de verificación
              </p>
              <p className="font-mono text-lg font-bold tracking-[0.25em] text-foreground">
                {normalized}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {signedUrl ? (
                <Button render={<a href={signedUrl} target="_blank" rel="noopener noreferrer" />}>
                  <Download className="size-4" />
                  Ver PDF del certificado
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  El PDF aún no está disponible para este certificado.
                </p>
              )}
              <Button variant="outline" render={<Link href="/" />}>
                Ir al Diplomado
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Este certificado fue emitido por el Diplomado Apostólico Pastoral.
          Para reportar una sospecha de falsificación contacta al equipo.
        </p>
      </div>
    </main>
  );
}

function DataRow({
  icon,
  label,
  value,
  big = false,
  emphColor = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  big?: boolean;
  emphColor?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={[
          big ? "font-serif text-2xl font-semibold" : "text-base font-medium",
          emphColor ? "text-brand-coral" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function VerificationError({
  code,
  reason,
}: {
  code: string;
  reason?: string;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-3.5" />
          Inicio
        </Link>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-4 border-b bg-red-500/10 px-8 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20">
              <ShieldX className="size-6 text-red-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-red-700 dark:text-red-400">
                Verificación fallida
              </p>
              <p className="font-serif text-2xl font-semibold leading-tight text-red-900 dark:text-red-100">
                Certificado no encontrado
              </p>
            </div>
          </div>

          <div className="px-8 py-8 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              No encontramos ningún certificado con el código{" "}
              <span className="font-mono font-bold text-foreground">
                {code}
              </span>
              . Verifica que el código esté escrito correctamente. Los códigos
              tienen 8 caracteres hexadecimales en mayúsculas.
            </p>
            {reason && (
              <p className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
                {reason}
              </p>
            )}
            <div className="pt-2">
              <Button variant="outline" render={<Link href="/" />}>
                Volver al inicio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
