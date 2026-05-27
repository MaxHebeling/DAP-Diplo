import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { ResetPasswordRequestForm } from "@/components/auth/reset-password-request-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return {
    title: t("resetRequest.metaTitle"),
    description: t("resetRequest.metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function ResetPasswordRequestPage() {
  const t = await getTranslations("Auth");
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("resetRequest.title")}</CardTitle>
            <CardDescription>{t("resetRequest.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordRequestForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("resetRequest.rememberedQuestion")}{" "}
              <Link href="/login" className="underline underline-offset-4">
                {t("resetRequest.backToLogin")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
