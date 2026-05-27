"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  requestPasswordResetAction,
  type AuthFormState,
} from "@/lib/auth/actions";

const initialState: AuthFormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth");
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("resetRequest.submitting") : t("resetRequest.submit")}
    </Button>
  );
}

export function ResetPasswordRequestForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const t = useTranslations("Auth");

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-400" />
        <p className="font-medium text-foreground">
          {t("resetRequest.successTitle")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("resetRequest.successBody")}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t("resetRequest.emailLabel")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("resetRequest.emailPlaceholder")}
          />
          {state.fieldErrors?.email && (
            <FieldError>{state.fieldErrors.email[0]}</FieldError>
          )}
        </Field>
      </FieldGroup>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
