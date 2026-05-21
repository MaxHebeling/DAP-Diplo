"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  );
}

export function SignUpForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      <SignInWithGoogle
        redirectTo={redirectTo}
        label="Continuar con Google"
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            o con tu correo
          </span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-6">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
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
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
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
          <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
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
            Ministerio <span className="text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input id="ministryName" name="ministryName" type="text" />
          {state.fieldErrors?.ministryName && (
            <FieldError>{state.fieldErrors.ministryName[0]}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="country">País</FieldLabel>
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
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </form>
    </div>
  );
}
