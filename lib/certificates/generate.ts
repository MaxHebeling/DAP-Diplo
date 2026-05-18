import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDocument } from "@/components/certificate/certificate-document";

export type CertificateData = {
  fullName: string;
  phaseOrderIndex: number;
  phaseTitle: string;
  dimensionName: string;
  verificationCode: string;
  issuedAt: Date;
};

export async function generateCertificate(
  data: CertificateData,
): Promise<Buffer> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";
  const verifyUrl = `${appUrl}/verificar/${data.verificationCode}`;
  return await renderToBuffer(
    CertificateDocument({ ...data, verifyUrl }),
  );
}
