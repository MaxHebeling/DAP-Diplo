import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { redirectTo } = await searchParams;

  if (user) {
    redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/modulos");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            DAP
          </Link>
          <CardTitle className="text-2xl">Inicia sesión</CardTitle>
          <CardDescription>
            Accede a tus módulos y continúa donde lo dejaste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
