import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("privacy.metaTitle"),
    description: t("privacy.metaDescription"),
    alternates: { canonical: "/privacidad" },
  };
}

export default async function PrivacidadPage() {
  const t = await getTranslations("PublicPages");
  return (
    <LegalPageLayout
      eyebrow={t("privacy.eyebrow")}
      title={t("privacy.title")}
      updatedAt={t("privacy.updatedAt")}
    >
      <p>
        {t("privacy.introPre")}
        <strong>{t("privacy.introDap")}</strong>
        {t("privacy.introMid")}
        <strong>{t("privacy.introCompany")}</strong>
        {t("privacy.introPost")}
      </p>

      <h2>{t("privacy.s1Heading")}</h2>
      <p>
        {t("privacy.s1Body")}{" "}
        <Link href="/">{t("privacy.s1Site")}</Link>.
      </p>
      <p>
        {t("privacy.s1ContactLabel")}{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <h2>{t("privacy.s2Heading")}</h2>
      <h3>{t("privacy.s2aHeading")}</h3>
      <ul>
        <li>{t("privacy.s2aItem1")}</li>
        <li>{t("privacy.s2aItem2")}</li>
        <li>{t("privacy.s2aItem3")}</li>
        <li>{t("privacy.s2aItem4")}</li>
        <li>{t("privacy.s2aItem5")}</li>
        <li>{t("privacy.s2aItem6")}</li>
      </ul>

      <h3>{t("privacy.s2bHeading")}</h3>
      <ul>
        <li>{t("privacy.s2bItem1")}</li>
        <li>{t("privacy.s2bItem2")}</li>
        <li>{t("privacy.s2bItem3")}</li>
        <li>{t("privacy.s2bItem4")}</li>
      </ul>

      <h2>{t("privacy.s3Heading")}</h2>
      <p>{t("privacy.s3Intro")}</p>
      <ul>
        <li><strong>{t("privacy.s3Item1Label")}</strong>{t("privacy.s3Item1Body")}</li>
        <li><strong>{t("privacy.s3Item2Label")}</strong>{t("privacy.s3Item2Body")}</li>
        <li><strong>{t("privacy.s3Item3Label")}</strong>{t("privacy.s3Item3Body")}</li>
        <li><strong>{t("privacy.s3Item4Label")}</strong>{t("privacy.s3Item4Body")}</li>
        <li><strong>{t("privacy.s3Item5Label")}</strong>{t("privacy.s3Item5Body")}</li>
        <li><strong>{t("privacy.s3Item6Label")}</strong>{t("privacy.s3Item6Body")}</li>
        <li><strong>{t("privacy.s3Item7Label")}</strong>{t("privacy.s3Item7Body")}</li>
        <li><strong>{t("privacy.s3Item8Label")}</strong>{t("privacy.s3Item8Body")}</li>
      </ul>

      <h2>{t("privacy.s4Heading")}</h2>
      <p>{t("privacy.s4Intro")}</p>
      <ul>
        <li><strong>{t("privacy.s4Item1Label")}</strong>{t("privacy.s4Item1Body")}</li>
        <li><strong>{t("privacy.s4Item2Label")}</strong>{t("privacy.s4Item2Body")}</li>
        <li><strong>{t("privacy.s4Item3Label")}</strong>{t("privacy.s4Item3Body")}</li>
        <li><strong>{t("privacy.s4Item4Label")}</strong>{t("privacy.s4Item4Body")}</li>
        <li><strong>{t("privacy.s4Item5Label")}</strong>{t("privacy.s4Item5Body")}</li>
        <li><strong>{t("privacy.s4Item6Label")}</strong>{t("privacy.s4Item6Body")}</li>
      </ul>
      <p>{t("privacy.s4Outro")}</p>

      <h2>{t("privacy.s5Heading")}</h2>
      <p>{t("privacy.s5Intro")}</p>
      <ul>
        <li><strong>{t("privacy.s5Item1Label")}</strong>{t("privacy.s5Item1Body")}</li>
        <li><strong>{t("privacy.s5Item2Label")}</strong>{t("privacy.s5Item2Body")}</li>
        <li><strong>{t("privacy.s5Item3Label")}</strong>{t("privacy.s5Item3Body")}</li>
      </ul>
      <p>{t("privacy.s5Outro")}</p>

      <h2>{t("privacy.s6Heading")}</h2>
      <p>{t("privacy.s6Intro")}</p>
      <ul>
        <li>{t("privacy.s6Item1")}</li>
        <li>{t("privacy.s6Item2")}</li>
        <li>{t("privacy.s6Item3")}</li>
        <li>{t("privacy.s6Item4")}</li>
      </ul>
      <p>{t("privacy.s6Outro")}</p>

      <h2>{t("privacy.s7Heading")}</h2>
      <ul>
        <li><strong>{t("privacy.s7Item1Label")}</strong>{t("privacy.s7Item1Body")}</li>
        <li><strong>{t("privacy.s7Item2Label")}</strong>{t("privacy.s7Item2Body")}</li>
        <li><strong>{t("privacy.s7Item3Label")}</strong>{t("privacy.s7Item3Body")}</li>
      </ul>

      <h2>{t("privacy.s8Heading")}</h2>
      <p>{t("privacy.s8Intro")}</p>
      <ul>
        <li><strong>{t("privacy.s8Item1Label")}</strong>{t("privacy.s8Item1Body")}</li>
        <li><strong>{t("privacy.s8Item2Label")}</strong>{t("privacy.s8Item2Body")}</li>
        <li><strong>{t("privacy.s8Item3Label")}</strong>{t("privacy.s8Item3Body")}</li>
        <li><strong>{t("privacy.s8Item4Label")}</strong>{t("privacy.s8Item4Body")}</li>
        <li><strong>{t("privacy.s8Item5Label")}</strong>{t("privacy.s8Item5Body")}</li>
        <li><strong>{t("privacy.s8Item6Label")}</strong>{t("privacy.s8Item6Body")}</li>
      </ul>
      <p>
        {t("privacy.s8OutroPre")}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
        {t("privacy.s8OutroPost")}
      </p>

      <h2>{t("privacy.s9Heading")}</h2>
      <p>{t("privacy.s9Body")}</p>

      <h2>{t("privacy.s10Heading")}</h2>
      <p>{t("privacy.s10Body")}</p>

      <h2>{t("privacy.s11Heading")}</h2>
      <p>{t("privacy.s11Body")}</p>

      <h2>{t("privacy.s12Heading")}</h2>
      <p>{t("privacy.s12Intro")}</p>
      <p>
        <strong>{t("privacy.s12Company")}</strong>
        <br />
        {t("privacy.s12EmailLabel")}{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        {t("privacy.copyright", { year: new Date().getFullYear() })}
      </p>
    </LegalPageLayout>
  );
}
