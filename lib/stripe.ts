import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return _stripe;
}

export const STRIPE_PRICE_IDS = {
  album_unique: process.env.STRIPE_PRICE_ALBUM_UNIQUE!,
  decouverte: process.env.STRIPE_PRICE_DECOUVERTE!,
  famille: process.env.STRIPE_PRICE_FAMILLE!,
} as const;

export type PriceTier = keyof typeof STRIPE_PRICE_IDS;

export const TIER_QUOTAS: Record<PriceTier, number> = {
  album_unique: 1,
  decouverte: 2,
  famille: 5,
};
