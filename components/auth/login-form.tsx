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
import { signInAction, type AuthFormState } from "@/lib/auth/actions";
import { SignInWithGoogle } from "@/components/auth/google-button";

const initialState: AuthFormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      <SignInWithGoogle redirectTo={redirectTo} />

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
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Link
              href="/reset-password"
              className="text-xs text-brand-coral hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {state.fieldErrors?.password && (
            <FieldError>{state.fieldErrors.password[0]}</FieldError>
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
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Crea una
        </Link>
      </p>
    </form>
    </div>
  );
}
