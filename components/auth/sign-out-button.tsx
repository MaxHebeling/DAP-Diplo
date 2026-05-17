"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

function Inner({ variant = "ghost" }: { variant?: "ghost" | "outline" | "default" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Saliendo..." : "Cerrar sesión"}
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
