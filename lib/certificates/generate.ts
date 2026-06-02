import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
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
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  const verifyUrl = `${appUrl}/verificar/${data.verificationCode}`;
  const t = await getTranslations("Certificate");
  return await renderToBuffer(
    CertificateDocument({ ...data, verifyUrl, t }),
  );
}
