import { NextResponse } from "next/server";
import { getStripe, STRIPE_PRICE_IDS, type PriceTier } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  tier: PriceTier;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tier } = (await req.json()) as Body;
  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 });
  }

  const isSubscription = tier !== "album_unique";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await getStripe().checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    metadata: { user_id: user.id, tier },
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
