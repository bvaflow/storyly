import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `invalid signature: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const supabase = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;
      if (!userId || !tier) break;

      if (tier === "album_unique") {
        await supabase.from("purchases").insert({
          user_id: userId,
          type: "album",
          amount_cents: session.amount_total ?? 0,
          stripe_session_id: session.id,
        });
      } else {
        const quota = tier === "famille" ? 5 : 2;
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_tier: tier,
            subscription_id: session.subscription as string,
            stripe_customer_id: session.customer as string,
            monthly_album_quota: quota,
            albums_used_this_period: 0,
          })
          .eq("user_id", userId);
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await supabase
        .from("profiles")
        .update({ albums_used_this_period: 0 })
        .eq("stripe_customer_id", customerId);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("profiles")
        .update({ subscription_status: "canceled" })
        .eq("subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
