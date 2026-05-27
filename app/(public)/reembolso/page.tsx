import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("refund.metaTitle"),
    description: t("refund.metaDescription"),
    alternates: { canonical: "/reembolso" },
  };
}

export default async function ReembolsoPage() {
  const t = await getTranslations("PublicPages");
  return (
    <LegalPageLayout
      eyebrow={t("refund.eyebrow")}
      title={t("refund.title")}
      updatedAt={t("refund.updatedAt")}
    >
      <p>
        {t("refund.introPre")}
        <strong>{t("refund.introDap")}</strong>
        {t("refund.introPost")}
      </p>

      <h2>{t("refund.s1Heading")}</h2>
      <p>
        <strong>{t("refund.s1Strong")}</strong>
        {t("refund.s1BodyMid")}
        <strong>{t("refund.s1Amount")}</strong>
        {t("refund.s1BodyPost")}
      </p>

      <h2>{t("refund.s2Heading")}</h2>
      <ol>
        <li>
          {t("refund.s2Item1Pre")}
          <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
          {t("refund.s2Item1Post")}
        </li>
        <li>
          {t("refund.s2Item2Pre")}
          <em>{t("refund.s2Item2Em")}</em>
          {t("refund.s2Item2Post")}
        </li>
        <li>{t("refund.s2Item3")}</li>
      </ol>
      <p>
        {t("refund.s2OutroPre")}
        <strong>{t("refund.s2OutroStrong")}</strong>
        {t("refund.s2OutroPost")}
      </p>

      <h2>{t("refund.s3Heading")}</h2>
      <p>
        {t("refund.s3Pre")}
        <strong>{t("refund.s3Strong")}</strong>
        {t("refund.s3Post")}
      </p>
      <ul>
        <li>{t("refund.s3Item1")}</li>
        <li>{t("refund.s3Item2")}</li>
        <li>{t("refund.s3Item3")}</li>
      </ul>
      <p>{t("refund.s3Outro")}</p>

      <h2>{t("refund.s4Heading")}</h2>
      <p>{t("refund.s4Body1")}</p>
      <p>
        {t("refund.s4Body2Pre")}
        <strong>{t("refund.s4Body2Strong")}</strong>
        {t("refund.s4Body2Post")}
      </p>

      <h2>{t("refund.s5Heading")}</h2>
      <h3>{t("refund.s51Heading")}</h3>
      <p>{t("refund.s51Body")}</p>
      <h3>{t("refund.s52Heading")}</h3>
      <p>{t("refund.s52Body")}</p>
      <h3>{t("refund.s53Heading")}</h3>
      <p>
        {t("refund.s53Pre")}
        <Link href="/terminos">{t("refund.s53Link")}</Link>
        {t("refund.s53Post")}
      </p>

      <h2>{t("refund.s6Heading")}</h2>
      <p>{t("refund.s6Body")}</p>

      <h2>{t("refund.s7Heading")}</h2>
      <p>{t("refund.s7Intro")}</p>
      <p>
        <strong>{t("refund.s7Company")}</strong>
        <br />
        {t("refund.s7EmailLabel")}{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        {t("refund.footerPre")}
        <Link href="/terminos">{t("refund.footerLink")}</Link>
        {t("refund.footerPost")}
      </p>

      <p className="mt-2 text-sm text-text-tertiary">
        {t("refund.copyright", { year: new Date().getFullYear() })}
      </p>
    </LegalPageLayout>
  );
}
