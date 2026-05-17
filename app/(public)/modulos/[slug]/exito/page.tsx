import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { formatPrice } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export const metadata = {
  title: "¡Compra exitosa! — DAP",
};

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  // Validar que el módulo existe (slug bien formado en la URL)
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("modules")
    .select("id, slug, title")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!m) notFound();

  // Defensa en profundidad: si el webhook todavía no procesó el evento
  // pero el usuario ya está acá tras pagar, verificamos la sesión con
  // Stripe y creamos la fila de enrollment manualmente como fallback.
  // Esto cubre delays/pérdidas del webhook sin dejar al usuario colgado.
  let amountPaidCents: number | null = null;

  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      const paid =
        session.payment_status === "paid" || session.status === "complete";
      const userIdFromSession = session.metadata?.userId;
      const moduleIdFromSession = session.metadata?.moduleId;
      amountPaidCents = session.amount_total ?? null;

      if (
        paid &&
        userIdFromSession &&
        moduleIdFromSession === m.id
      ) {
        const admin = createAdminClient();
        // upsert idempotente; no falla si el webhook ya lo insertó.
        await admin.from("enrollments").upsert(
          {
            user_id: userIdFromSession,
            module_id: m.id,
            stripe_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
            amount_paid_cents: session.amount_total ?? 0,
            currency: (session.currency ?? "usd").toLowerCase(),
            status: "active",
          },
          { onConflict: "user_id,module_id", ignoreDuplicates: true },
        );
      }
    } catch (err) {
      // No tirar: el webhook puede arreglarlo. Solo loguear.
      console.error("[checkout.success] fallback failed:", err);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 text-center">
          <Logo size="md" />
          <CardTitle className="text-2xl">¡Compra exitosa!</CardTitle>
          <CardDescription>
            Ya tienes acceso permanente a{" "}
            <span className="font-medium text-foreground">{m.title}</span>.
            {amountPaidCents !== null && (
              <>
                {" "}Cargo: {formatPrice(amountPaidCents)}.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            className="w-full"
            render={<Link href={`/modulos/${m.slug}`} />}
          >
            Comenzar el módulo
          </Button>
          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/dashboard" />}
          >
            Ir a mi dashboard
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Recibirás un correo de confirmación de Stripe.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
