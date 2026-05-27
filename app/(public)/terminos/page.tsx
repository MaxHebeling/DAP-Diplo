import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("terms.metaTitle"),
    description: t("terms.metaDescription"),
    alternates: { canonical: "/terminos" },
  };
}

export default async function TerminosPage() {
  const t = await getTranslations("PublicPages");
  return (
    <LegalPageLayout
      eyebrow={t("terms.eyebrow")}
      title={t("terms.title")}
      updatedAt={t("terms.updatedAt")}
    >
      <p>
        {t("terms.introPre")}
        <strong>{t("terms.introDap")}</strong>
        {t("terms.introOr")}
        <strong>{t("terms.introService")}</strong>
        {t("terms.introMid")}
        <Link href="/">{t("terms.introSite")}</Link>
        {t("terms.introPost")}
      </p>

      <p>
        {t("terms.operatedPre")}
        <strong>{t("terms.operatedCompany")}</strong>
        {t("terms.operatedMid")}
        <strong>{t("terms.operatedWe")}</strong>
        {t("terms.operatedOr")}
        <strong>{t("terms.operatedTheCompany")}</strong>
        {t("terms.operatedPost")}
      </p>

      <p>{t("terms.accept")}</p>

      <h2>{t("terms.s1Heading")}</h2>
      <p>{t("terms.s1Body1")}</p>
      <p>
        {t("terms.s1Body2Pre")}
        <strong>{t("terms.s1Body2Strong")}</strong>
        {t("terms.s1Body2Post")}
      </p>
      <p>
        {t("terms.s1Body3Pre")}
        <strong>{t("terms.s1Body3Strong")}</strong>
        {t("terms.s1Body3Post")}
      </p>

      <h2>{t("terms.s2Heading")}</h2>
      <p>{t("terms.s2Body")}</p>
      <ul>
        <li>{t("terms.s2Item1")}</li>
        <li>{t("terms.s2Item2")}</li>
        <li>{t("terms.s2Item3Pre")}{" "}
          <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
        </li>
      </ul>

      <h2>{t("terms.s3Heading")}</h2>
      <p>
        {t("terms.s3BodyPre")}
        <strong>{t("terms.s3BodyStrong")}</strong>
        {t("terms.s3BodyPost")}
      </p>
      <h3>{t("terms.s31Heading")}</h3>
      <p>{t("terms.s31Body")}</p>
      <h3>{t("terms.s32Heading")}</h3>
      <p>{t("terms.s32Body")}</p>

      <h2>{t("terms.s4Heading")}</h2>
      <p>
        {t("terms.s4Body1Pre")}
        <strong>{t("terms.s4Body1Strong")}</strong>
        {t("terms.s4Body1Post")}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
      </p>
      <p>{t("terms.s4Body2")}</p>
      <p>
        {t("terms.s4Body3Pre")}
        <Link href="/reembolso">{t("terms.s4Body3Link")}</Link>.
      </p>

      <h2>{t("terms.s5Heading")}</h2>
      <p>{t("terms.s5Body1")}</p>
      <p>{t("terms.s5Body2")}</p>
      <p>{t("terms.s5Body3")}</p>
      <ul>
        <li>{t("terms.s5Item1")}</li>
        <li>{t("terms.s5Item2")}</li>
        <li>{t("terms.s5Item3")}</li>
        <li>{t("terms.s5Item4")}</li>
      </ul>

      <h2>{t("terms.s6Heading")}</h2>
      <p>{t("terms.s6Body")}</p>

      <h2>{t("terms.s7Heading")}</h2>
      <p>{t("terms.s7Intro")}</p>
      <ul>
        <li>{t("terms.s7Item1")}</li>
        <li>{t("terms.s7Item2")}</li>
        <li>{t("terms.s7Item3")}</li>
        <li>{t("terms.s7Item4")}</li>
      </ul>
      <p>{t("terms.s7Outro")}</p>

      <h2>{t("terms.s8Heading")}</h2>
      <p>{t("terms.s8Body1")}</p>
      <p>{t("terms.s8Body2")}</p>

      <h2>{t("terms.s9Heading")}</h2>
      <p>{t("terms.s9Body")}</p>

      <h2>{t("terms.s10Heading")}</h2>
      <p>{t("terms.s10Body")}</p>

      <h2>{t("terms.s11Heading")}</h2>
      <p>{t("terms.s11Body1")}</p>
      <p>{t("terms.s11Body2")}</p>

      <h2>{t("terms.s12Heading")}</h2>
      <p>
        {t("terms.s12BodyPre")}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        {t("terms.copyright", { year: new Date().getFullYear() })}
      </p>
    </LegalPageLayout>
  );
}
