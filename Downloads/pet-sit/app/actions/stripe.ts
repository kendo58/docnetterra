"use server"

import { getStripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

type ListingRef = { user_id: string; title: string | null }
type BookingPaymentRow = {
  id: string
  sitter_id: string
  status: string
  payment_status: string | null
  insurance_cost: number | null
  stripe_payment_intent_id: string | null
  listing: ListingRef | ListingRef[] | null
}

function normalizeListing(listing: BookingPaymentRow["listing"]): ListingRef | null {
  if (!listing) return null
  return Array.isArray(listing) ? (listing[0] ?? null) : listing
}

async function loadBookingContext(bookingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, sitter_id, status, payment_status, insurance_cost, stripe_payment_intent_id, listing:listings(user_id, title)")
    .eq("id", bookingId)
    .maybeSingle<BookingPaymentRow>()

  if (error) throw error
  if (!booking) throw new Error("Sit not found")

  const listing = normalizeListing(booking.listing)
  const isSitter = booking.sitter_id === user.id
  const isHomeowner = listing?.user_id === user.id

  return {
    supabase,
    user,
    booking: { ...booking, listing },
    isSitter,
    isHomeowner,
  }
}

function getInsuranceAmountCents(booking: { insurance_cost: number | null }) {
  const amount = Number(booking.insurance_cost ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("No insurance payment is required for this sit")
  }
  return Math.round(amount * 100)
}

function assertBookingIsPayable(booking: { status: string; payment_status: string | null }) {
  if (!["confirmed", "accepted"].includes(booking.status)) {
    throw new Error("This sit isn't ready for payment")
  }
  if (booking.payment_status === "paid") {
    throw new Error("This sit has already been paid")
  }
}

async function getOrCreateCustomerId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, fallbackEmail?: string | null) {
  const stripe = getStripe()
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, full_name")
    .eq("id", userId)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id
  if (customerId) return customerId

  const customer = await stripe.customers.create({
    email: profile?.email || fallbackEmail || undefined,
    name: profile?.full_name || undefined,
    metadata: { supabase_user_id: userId },
  })

  customerId = customer.id
  const { error: profileUpdateError } = await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId)
  if (profileUpdateError) {
    console.warn("[sitswap] Failed to persist stripe_customer_id:", profileUpdateError)
  }

  return customerId
}

export async function createCheckoutSession(bookingId: string, _amount: number, description: string) {
  const stripe = getStripe()
  const { supabase, user, booking, isSitter } = await loadBookingContext(bookingId)

  if (!isSitter) {
    throw new Error("Only the sitter can create checkout sessions")
  }

  assertBookingIsPayable(booking)
  const amountCents = getInsuranceAmountCents(booking)
  const customerId = await getOrCreateCustomerId(supabase, user.id, user.email)
  const listingTitle = booking.listing?.title || "SitSwap sit"
  const sessionTitle = description?.trim() || `${listingTitle} protection`

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: sessionTitle,
            description: "Protection plan for your sit",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    redirect_on_completion: "never",
    metadata: {
      booking_id: bookingId,
      user_id: user.id,
    },
  }, {
    idempotencyKey: `booking:${bookingId}:checkout:${amountCents}`,
  })

  if (!session.client_secret) {
    throw new Error("Stripe checkout session is missing a client secret")
  }

  return session.client_secret
}

export async function createPaymentIntent(bookingId: string, _amount: number) {
  const stripe = getStripe()
  const { supabase, user, booking, isSitter } = await loadBookingContext(bookingId)

  if (!isSitter) {
    throw new Error("Only the sitter can create payment intents")
  }

  assertBookingIsPayable(booking)
  const amountCents = getInsuranceAmountCents(booking)
  const customerId = await getOrCreateCustomerId(supabase, user.id, user.email)

  if (booking.stripe_payment_intent_id) {
    const existingIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
    const reusableStatuses = new Set([
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
    ])

    if (
      reusableStatuses.has(existingIntent.status) &&
      existingIntent.amount === amountCents &&
      typeof existingIntent.client_secret === "string"
    ) {
      return {
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
      }
    }

    if (existingIntent.status === "succeeded") {
      throw new Error("This sit has already been paid")
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId,
    metadata: {
      booking_id: bookingId,
      user_id: user.id,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  }, {
    idempotencyKey: `booking:${bookingId}:payment_intent:${amountCents}`,
  })

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", bookingId)
    .eq("sitter_id", user.id)

  if (updateError) {
    throw new Error("Failed to link payment intent to sit")
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }
}

export async function processRefund(bookingId: string, reason?: string) {
  const stripe = getStripe()
  const { supabase, user, booking, isSitter, isHomeowner } = await loadBookingContext(bookingId)

  if (!isSitter && !isHomeowner) {
    throw new Error("Only sit participants can request a refund")
  }

  if (booking.payment_status !== "paid") {
    throw new Error("This sit has not been paid")
  }

  if (booking.status === "completed") {
    throw new Error("Completed sits cannot be refunded automatically")
  }

  if (!booking.stripe_payment_intent_id) {
    throw new Error("No payment found for this sit")
  }

  const refund = await stripe.refunds.create({
    payment_intent: booking.stripe_payment_intent_id,
    reason: "requested_by_customer",
    metadata: {
      booking_id: bookingId,
      refund_reason: reason || "Sit cancelled",
      user_id: user.id,
    },
  })

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "refunded",
      payment_status: "refunded",
      refunded_at: now,
      cancelled_at: now,
      cancelled_by: user.id,
      cancellation_reason: reason ?? null,
    })
    .eq("id", bookingId)

  if (updateError) {
    throw new Error("Refund succeeded but booking update failed")
  }

  return refund
}

export async function getPaymentStatus(paymentIntentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, sitter_id, listing:listings(user_id)")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle<{ id: string; sitter_id: string; listing: { user_id: string } | { user_id: string }[] | null }>()

  if (error) throw error
  if (!booking) throw new Error("Payment not found")

  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing
  if (booking.sitter_id !== user.id && listing?.user_id !== user.id) {
    throw new Error("Unauthorized")
  }

  const stripe = getStripe()
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100,
  }
}
