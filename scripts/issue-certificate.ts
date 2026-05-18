// Uso: pnpm exec tsx scripts/issue-certificate.ts <certificate_id>
// One-shot para disparar la emisión del PDF de un certificado existente.
// Útil para backfill / debug.

import { config } from "dotenv";
config({ path: ".env.local" });

import { issueCertificatePdf } from "../lib/certificates/issue";
import { signedCertificateUrl } from "../lib/certificates/upload";

async function main() {
  const certId = process.argv[2];
  if (!certId) {
    console.error("Uso: tsx scripts/issue-certificate.ts <certificate_id>");
    process.exit(1);
  }
  console.log(`Generando PDF para ${certId}…`);
  const { path, skipped } = await issueCertificatePdf(certId);
  if (skipped) {
    console.log(`(ya existía pdf_url; no regenerado)`);
  }
  console.log(`Path: ${path}`);
  const url = await signedCertificateUrl(path, 3600);
  console.log(`Signed URL (1h): ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
