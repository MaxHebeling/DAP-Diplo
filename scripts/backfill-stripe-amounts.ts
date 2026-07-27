// Backfill: subs Stripe con amount_minor=0 — consulta Stripe API y
// actualiza con el unit_amount real del price.
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, user_id, stripe_subscription_id, amount_minor, currency, status")
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`fetch: ${error.message}`);
  if (!subs?.length) return console.log("no Stripe subs");

  console.log(`Total subs Stripe: ${subs.length}\n`);
  let fixed = 0, skipped = 0, errored = 0;

  for (const sub of subs) {
    const r = await fetch(
      `https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}?expand[]=items.data.price`,
      { headers: { authorization: `Basic ${Buffer.from(stripeKey + ":").toString("base64")}` } },
    );
    if (!r.ok) {
      console.log(`  ❌ ${sub.stripe_subscription_id?.slice(0, 20)}: ${r.status}`);
      errored++; continue;
    }
    const data = (await r.json()) as {
      status: string;
      items: { data: Array<{ price: { unit_amount: number | null; currency: string } }> };
    };
    const price = data.items?.data?.[0]?.price;
    const stripeAmount = price?.unit_amount ?? 0;
    const stripeCurrency = price?.currency?.toUpperCase() ?? "USD";

    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", sub.user_id).single();
    const name = prof?.full_name ?? "?";

    if (stripeAmount === sub.amount_minor && stripeCurrency === sub.currency) {
      console.log(`  ✓ ${name.padEnd(30)} OK (${stripeAmount/100} ${stripeCurrency})`);
      skipped++; continue;
    }

    await admin.from("subscriptions")
      .update({
        amount_minor: stripeAmount,
        currency: stripeCurrency,
        payment_processor: "stripe",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    console.log(`  🔧 ${name.padEnd(30)} ${sub.amount_minor}${sub.currency} → ${stripeAmount} ${stripeCurrency}`);
    fixed++;
    await new Promise((r) => setTimeout(r, 100)); // gentle rate limit
  }

  console.log(`\n✅ Fixed: ${fixed} · ✓ OK: ${skipped} · ❌ Errored: ${errored}`);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
