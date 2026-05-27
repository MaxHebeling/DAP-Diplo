import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarClock, ArrowLeft, GraduationCap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return {
    title: t("signup.metaTitle"),
    description: t("signup.metaDescription"),
    robots: { index: false, follow: true },
  };
}

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("Auth");

  if (!isEnrollmentOpen()) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center space-y-4">
            <Logo size="md" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <CalendarClock className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">
              {t("signup.enrollmentClosed.title", {
                date: ENROLLMENT_OPENS_LABEL,
              })}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {t.rich("signup.enrollmentClosed.body", {
                launchDate: t("signup.enrollmentClosed.launchDate"),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-brand-violet/25 bg-brand-violet/[0.06] p-4 text-left">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">
                  {t("signup.enrollmentClosed.classesStartLabel")}
                </span>{" "}
                <span className="capitalize text-muted-foreground">
                  {CLASSES_START_LABEL}
                </span>
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-brand-coral hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("signup.enrollmentClosed.backToHome")}
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { redirectTo } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 text-center">
          <Logo size="md" />
          <CardTitle className="text-2xl">{t("signup.title")}</CardTitle>
          <CardDescription>{t("signup.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
