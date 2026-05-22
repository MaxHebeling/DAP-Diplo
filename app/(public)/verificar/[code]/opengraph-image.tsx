import { ImageResponse } from "next/og";
import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";

import {
  CosmicLayout,
  OG_CONTENT_TYPE,
  OG_SIZE,
  loadLogoDataUrl,
} from "@/lib/og/cosmic-bg";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Certificado verificado — DAP";

type PageProps = { params: Promise<{ code: string }> };

type VerifyRow = {
  full_name: string;
  phase_order_index: number;
  phase_title: string;
  dimension_name: string | null;
  issued_at: string;
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

function formatIssued(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export default async function Image({ params }: PageProps) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  // Cliente plano (la RPC es SECURITY DEFINER y devuelve solo datos públicos).
  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase.rpc("verify_certificate", {
    p_code: normalized,
  });

  const logoSrc = await loadLogoDataUrl();

  // Si no existe o falló: OG genérica de "verificación".
  const rows = (data ?? []) as VerifyRow[];
  const cert = !error ? rows[0] : null;

  if (!cert) {
    return new ImageResponse(
      (
        <CosmicLayout
          logoSrc={logoSrc}
          eyebrow="Verificación de certificado"
          title="Certificado no encontrado"
          subtitle={`Código ${normalized} no corresponde a ningún certificado emitido por el DAP.`}
        />
      ),
      { ...size },
    );
  }

  const blockN = String(cert.phase_order_index).padStart(2, "0");
  const dimSuffix = cert.dimension_name
    ? ` · Dimensión ${cert.dimension_name}`
    : "";

  return new ImageResponse(
    (
      <CosmicLayout
        logoSrc={logoSrc}
        eyebrow={`✓ Certificado verificado · ${normalized}`}
        title={cert.full_name}
        subtitle={`Bloque ${blockN}: ${cert.phase_title}${dimSuffix} · Emitido el ${formatIssued(cert.issued_at)}`}
        footer={`dapglobal.org/verificar/${normalized}`}
      />
    ),
    { ...size },
  );
}
