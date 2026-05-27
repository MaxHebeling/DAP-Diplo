"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { SignInWithGoogle } from "@/components/auth/google-button";

const initialState: AuthFormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth");
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("signup.submitting") : t("signup.submit")}
    </Button>
  );
}

export function SignUpForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signUpAction, initialState);
  const t = useTranslations("Auth");

  return (
    <div className="flex flex-col gap-6">
      <SignInWithGoogle redirectTo={redirectTo} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {t("divider.orWithEmail")}
          </span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-6">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t("signup.emailLabel")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {state.fieldErrors?.email && (
            <FieldError>{state.fieldErrors.email[0]}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("signup.passwordLabel")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          {state.fieldErrors?.password && (
            <FieldError>{state.fieldErrors.password[0]}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="fullName">{t("signup.fullNameLabel")}</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
          />
          {state.fieldErrors?.fullName && (
            <FieldError>{state.fieldErrors.fullName[0]}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="ministryName">
            {t("signup.ministryLabel")}{" "}
            <span className="text-muted-foreground">
              {t("signup.ministryOptional")}
            </span>
          </FieldLabel>
          <Input id="ministryName" name="ministryName" type="text" />
          {state.fieldErrors?.ministryName && (
            <FieldError>{state.fieldErrors.ministryName[0]}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="country">{t("signup.countryLabel")}</FieldLabel>
          <Input
            id="country"
            name="country"
            type="text"
            autoComplete="country-name"
            required
          />
          {state.fieldErrors?.country && (
            <FieldError>{state.fieldErrors.country[0]}</FieldError>
          )}
        </Field>
      </FieldGroup>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        {t("signup.haveAccount")}{" "}
        <Link href="/login" className="underline underline-offset-4">
          {t("signup.logIn")}
        </Link>
      </p>
    </form>
    </div>
  );
}
