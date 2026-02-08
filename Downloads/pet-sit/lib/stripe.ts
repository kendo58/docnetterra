import "server-only"

import Stripe from "stripe"
import { getServerEnv } from "@/lib/env/server"

let cachedStripe: Stripe | null = null

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe

  const { STRIPE_SECRET_KEY } = getServerEnv()
  if (!STRIPE_SECRET_KEY) {
    throw new Error("[sitswap] Missing `STRIPE_SECRET_KEY`. Set it in `.env.local` (or your hosting provider).")
  }

  cachedStripe = new Stripe(STRIPE_SECRET_KEY)
  return cachedStripe
}
