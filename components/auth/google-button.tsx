"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/lib/auth/actions";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className="shrink-0"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.5l2.64-2.54C16.86 3.4 14.66 2.4 12 2.4 6.86 2.4 2.7 6.55 2.7 11.7s4.16 9.3 9.3 9.3c5.36 0 8.92-3.76 8.92-9.06 0-.6-.06-1.06-.14-1.74H12z"
      />
      <path
        fill="#34A853"
        d="M3.96 7.04l3.06 2.24C7.86 7.4 9.78 6 12 6c1.88 0 3.14.8 3.86 1.5l2.64-2.54C16.86 3.4 14.66 2.4 12 2.4 8.34 2.4 5.18 4.4 3.96 7.04z"
      />
      <path
        fill="#FBBC05"
        d="M12 21c2.62 0 4.82-.86 6.42-2.34l-3.04-2.5c-.84.6-1.94 1.04-3.38 1.04-2.6 0-4.8-1.74-5.58-4.08l-3.1 2.4C4.88 18.78 8.16 21 12 21z"
      />
      <path
        fill="#4285F4"
        d="M20.92 11.94c0-.6-.06-1.06-.14-1.74H12v3.9h5.5c-.22 1.28-1.06 2.32-2.12 3.06l3.04 2.5c1.78-1.64 2.5-4.06 2.5-7.72z"
      />
    </svg>
  );
}

function GoogleButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full justify-center gap-3 border-white/15 bg-white text-neutral-800 hover:bg-neutral-100"
    >
      <GoogleIcon />
      {pending ? "Conectando..." : label}
    </Button>
  );
}

type Props = {
  redirectTo?: string;
  label?: string;
};

export function SignInWithGoogle({
  redirectTo,
  label = "Continuar con Google",
}: Props) {
  return (
    <form action={signInWithGoogleAction} className="w-full">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
      <GoogleButton label={label} />
    </form>
  );
}
