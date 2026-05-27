"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

function Inner({ variant = "ghost" }: { variant?: "ghost" | "outline" | "default" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth");
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? t("signOut.signingOut") : t("signOut.label")}
    </Button>
  );
}

export function SignOutButton({
  variant,
}: {
  variant?: "ghost" | "outline" | "default";
}) {
  return (
    <form action={signOutAction}>
      <Inner variant={variant} />
    </form>
  );
}
