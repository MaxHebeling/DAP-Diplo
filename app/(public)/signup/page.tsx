import { redirect } from "next/navigation";
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

  const { redirectTo } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 text-center">
          <Logo size="md" />
          <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
          <CardDescription>
            Acceso permanente a los módulos que compres. Avanza a tu ritmo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
