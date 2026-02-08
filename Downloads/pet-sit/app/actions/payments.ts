"use server"

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calculateBookingFees, clampPoints, CLEANING_FEE, SERVICE_FEE_PER_NIGHT } from "@/lib/pricing/fees"
import { sendBookingPaidEmail } from "@/app/actions/email"
import { hasPostgresCode } from "@/lib/utils/supabase-errors"
import { getServerEnv } from "@/lib/env/server"
import { getStripe } from "@/lib/stripe"

type AtomicPaymentResult = {
  updated: boolean
  already_paid: boolean
  points_applied: number
  cash_due: number
}

type AtomicPaymentRpcArgs = {
  p_booking_id: string
  p_sitter_id: string
  p_requested_points: number
  p_service_fee_per_night: number
  p_cleaning_fee: number
  p_service_fee_total: number
  p_total_fee: number
  p_paid_at: string
}

type CheckoutSessionResult = {
  error: string | null
  clientSecret: string | null
}

async function notifyBookingPaid(booking: {
  id: string
  sitter_id: string
  listing: { user_id: string; title?: string | null }
}) {
  const adminSupabase = createAdminClient()

  await adminSupabase.from("notifications").insert([
    {
      user_id: booking.listing.user_id,
      type: "booking_paid",
      title: "Payment received",
      body: "The sitter has paid the service and cleaning fees.",
      data: { booking_id: booking.id, url: `/sits/${booking.id}` },
    },
    {
      user_id: booking.sitter_id,
      type: "booking_paid",
      title: "Payment completed",
      body: "Your payment is complete. The address is now available.",
      data: { booking_id: booking.id, url: `/sits/${booking.id}` },
    },
  ])

  try {
    await sendBookingPaidEmail(booking.id)
  } catch (emailError) {
    console.warn("[sitswap] Failed to send payment email notifications:", emailError)
  }
}

async function getOrCreateCustomerId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  fallbackEmail?: string | null,
) {
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

async function runAtomicBookingPaymentRpc(options: {
  args: AtomicPaymentRpcArgs
  cashPaid: number
}): Promise<{ data: AtomicPaymentResult | null; error: unknown | null }> {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .rpc("pay_booking_with_points", {
      ...options.args,
      p_cash_paid: options.cashPaid,
    })
    .maybeSingle<AtomicPaymentResult>()

  if (!error) {
    return { data: data ?? null, error: null }
  }

  const overloadedRpcUnavailable = hasPostgresCode(error, "42883") || hasPostgresCode(error, "PGRST202")
  if (!overloadedRpcUnavailable) {
    return { data: null, error }
  }

  const fallback = await adminSupabase
    .rpc("pay_booking_with_points", options.args)
    .maybeSingle<AtomicPaymentResult>()

  return {
    data: fallback.data ?? null,
    error: fallback.error ?? null,
  }
}

export async function completeBookingPayment(bookingId: string, requestedPoints: number) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, listing:listings(user_id, title)")
    .eq("id", bookingId)
    .single()

  if (!booking) {
    return { error: "Sit not found" }
  }

  if (booking.sitter_id !== user.id) {
    return { error: "Only the sitter can complete payment" }
  }

  if (!["confirmed", "accepted"].includes(booking.status)) {
    return { error: "This sit isn't ready for payment yet" }
  }

  if (booking.payment_status === "paid") {
    return { error: null }
  }

  const { ALLOW_MANUAL_BOOKING_PAYMENTS } = getServerEnv()
  const manualPaymentsEnabled =
    process.env.NODE_ENV !== "production" || Boolean(ALLOW_MANUAL_BOOKING_PAYMENTS)

  const feeSummary = calculateBookingFees({
    startDate: booking.start_date,
    endDate: booking.end_date,
    serviceFeePerNight: Number(booking.service_fee_per_night ?? SERVICE_FEE_PER_NIGHT),
    cleaningFee: Number(booking.cleaning_fee ?? CLEANING_FEE),
    insuranceCost: Number(booking.insurance_cost ?? 0),
  })

  const adminSupabase = createAdminClient()
  const normalizedRequestedPoints = Number.isFinite(requestedPoints) ? Math.max(0, Math.floor(requestedPoints)) : 0
  const paidAt = new Date().toISOString()
  const totalFee = feeSummary.totalFee

  if (!manualPaymentsEnabled) {
    const { data: balanceRows, error: balanceError } = await adminSupabase
      .from("points_ledger")
      .select("points_delta")
      .eq("user_id", user.id)

    if (balanceError) {
      console.warn("[sitswap] Failed to read points balance for manual-payment guard:", balanceError)
      return {
        error:
          "Manual booking payments are disabled in production. Configure Stripe checkout for this booking payment flow.",
      }
    }

    const pointsBalance = Math.max((balanceRows ?? []).reduce((sum, row) => sum + Number(row.points_delta || 0), 0), 0)
    const pointsToApplyEstimate = clampPoints({
      requested: normalizedRequestedPoints,
      balance: pointsBalance,
      nights: feeSummary.nights,
    })
    const pointsValueEstimate = pointsToApplyEstimate * feeSummary.serviceFeePerNight
    const cashDueEstimate = Math.max(totalFee - pointsValueEstimate, 0)

    if (cashDueEstimate > 0) {
      return {
        error:
          "Manual booking payments are disabled in production. Configure Stripe checkout for this booking payment flow.",
      }
    }
  }

  const { data: atomicResult, error: atomicError } = await runAtomicBookingPaymentRpc({
    args: {
      p_booking_id: bookingId,
      p_sitter_id: user.id,
      p_requested_points: normalizedRequestedPoints,
      p_service_fee_per_night: feeSummary.serviceFeePerNight,
      p_cleaning_fee: feeSummary.cleaningFee,
      p_service_fee_total: feeSummary.serviceFeeTotal,
      p_total_fee: totalFee,
      p_paid_at: paidAt,
    },
    // Non-webhook/manual flows do not carry Stripe settlement data.
    cashPaid: totalFee,
  })

  const atomicPaymentFunctionUnavailable =
    !!atomicError &&
    (hasPostgresCode(atomicError, "42883") ||
      hasPostgresCode(atomicError, "42P01") ||
      hasPostgresCode(atomicError, "PGRST202"))

  if (atomicError && !atomicPaymentFunctionUnavailable) {
    console.warn("[sitswap] Atomic booking payment failed:", atomicError)
    return { error: "Payment could not be completed." }
  }

  if (atomicResult) {
    if (atomicResult.already_paid) {
      return { error: null }
    }

    if (!atomicResult.updated) {
      const { data: latest } = await adminSupabase.from("bookings").select("payment_status").eq("id", bookingId).maybeSingle()
      if (latest?.payment_status === "paid") {
        return { error: null }
      }

      return { error: "Payment could not be completed." }
    }

    await notifyBookingPaid(booking)
    return { error: null }
  }

  if (atomicPaymentFunctionUnavailable) {
    console.warn("[sitswap] pay_booking_with_points RPC unavailable; using legacy payment path")
  }

  const { data: ledgerRows, error: ledgerError } = await adminSupabase
    .from("points_ledger")
    .select("points_delta")
    .eq("user_id", user.id)

  if (ledgerError) {
    console.warn("[sitswap] Failed to read points balance:", ledgerError)
  }

  const rawBalance = (ledgerRows ?? []).reduce((sum, row) => sum + Number(row.points_delta || 0), 0)
  const pointsBalance = Math.max(rawBalance, 0)
  const pointsToApply = clampPoints({ requested: normalizedRequestedPoints, balance: pointsBalance, nights: feeSummary.nights })
  const pointsValue = pointsToApply * feeSummary.serviceFeePerNight
  const cashDue = Math.max(totalFee - pointsValue, 0)
  let pointsDebited = false

  if (pointsToApply > 0) {
    const { error: pointsError } = await adminSupabase.from("points_ledger").insert({
      user_id: user.id,
      booking_id: booking.id,
      points_delta: -Math.abs(pointsToApply),
      reason: "booking_payment_points",
    })

    if (pointsError) {
      console.warn("[sitswap] Failed to apply points:", pointsError)
      return { error: "Unable to apply points right now." }
    }

    pointsDebited = true
  }

  const { data: updatedBooking, error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      service_fee_per_night: feeSummary.serviceFeePerNight,
      cleaning_fee: feeSummary.cleaningFee,
      service_fee_total: feeSummary.serviceFeeTotal,
      total_fee: totalFee,
      points_applied: pointsToApply,
      cash_due: cashDue,
      payment_status: "paid",
      paid_at: paidAt,
      payment_method: "dummy",
    })
    .eq("id", bookingId)
    .eq("sitter_id", user.id)
    .in("status", ["confirmed", "accepted"])
    .neq("payment_status", "paid")
    .select("id")
    .maybeSingle()

  if (updateError || !updatedBooking) {
    if (pointsDebited) {
      const { error: rollbackError } = await adminSupabase.from("points_ledger").insert({
        user_id: user.id,
        booking_id: booking.id,
        points_delta: Math.abs(pointsToApply),
        reason: "booking_payment_points_rollback",
      })

      if (rollbackError) {
        console.warn("[sitswap] Failed to rollback points debit:", rollbackError)
      }
    }

    if (!updatedBooking) {
      const { data: latest } = await adminSupabase.from("bookings").select("payment_status").eq("id", bookingId).maybeSingle()
      if (latest?.payment_status === "paid") {
        return { error: null }
      }
    }

    console.warn("[sitswap] Failed to mark payment as paid:", updateError)
    return { error: "Payment could not be completed." }
  }

  await notifyBookingPaid(booking)

  return { error: null }
}

export async function createBookingPaymentCheckoutSession(
  bookingId: string,
  requestedPoints: number,
): Promise<CheckoutSessionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, sitter_id, status, payment_status, start_date, end_date, service_fee_per_night, cleaning_fee, insurance_cost, listing:listings(title)")
    .eq("id", bookingId)
    .single()

  if (!booking) {
    return { error: "Sit not found", clientSecret: null }
  }

  if (booking.sitter_id !== user.id) {
    return { error: "Only the sitter can create a payment session", clientSecret: null }
  }

  if (!["confirmed", "accepted"].includes(booking.status)) {
    return { error: "This sit isn't ready for payment yet", clientSecret: null }
  }

  if (booking.payment_status === "paid") {
    return { error: "This sit has already been paid", clientSecret: null }
  }

  const feeSummary = calculateBookingFees({
    startDate: booking.start_date,
    endDate: booking.end_date,
    serviceFeePerNight: Number(booking.service_fee_per_night ?? SERVICE_FEE_PER_NIGHT),
    cleaningFee: Number(booking.cleaning_fee ?? CLEANING_FEE),
    insuranceCost: Number(booking.insurance_cost ?? 0),
  })

  const adminSupabase = createAdminClient()
  const normalizedRequestedPoints = Number.isFinite(requestedPoints) ? Math.max(0, Math.floor(requestedPoints)) : 0
  const { data: ledgerRows, error: ledgerError } = await adminSupabase
    .from("points_ledger")
    .select("points_delta")
    .eq("user_id", user.id)

  if (ledgerError) {
    console.warn("[sitswap] Failed to read points balance:", ledgerError)
  }

  const rawBalance = (ledgerRows ?? []).reduce((sum, row) => sum + Number(row.points_delta || 0), 0)
  const pointsBalance = Math.max(rawBalance, 0)
  const pointsToApply = clampPoints({ requested: normalizedRequestedPoints, balance: pointsBalance, nights: feeSummary.nights })
  const pointsValue = pointsToApply * feeSummary.serviceFeePerNight
  const cashDue = Math.max(feeSummary.totalFee - pointsValue, 0)

  if (cashDue <= 0) {
    return {
      error: "No cash checkout is required for this sit. Use direct completion for points-only payment.",
      clientSecret: null,
    }
  }

  const { ALLOW_MANUAL_BOOKING_PAYMENTS } = getServerEnv()
  const manualPaymentsEnabled =
    process.env.NODE_ENV !== "production" || Boolean(ALLOW_MANUAL_BOOKING_PAYMENTS)

  let customerId: string
  try {
    customerId = await getOrCreateCustomerId(supabase, user.id, user.email)
  } catch (error) {
    console.warn("[sitswap] Failed to get/create Stripe customer:", error)
    if (manualPaymentsEnabled) {
      return {
        error: "Stripe is unavailable. You can use manual checkout in this environment.",
        clientSecret: null,
      }
    }
    return { error: "Stripe payment is not configured.", clientSecret: null }
  }

  const stripe = getStripe()
  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing
  const listingTitle = listing?.title ?? "SitSwap sit"
  const unitAmount = Math.max(0, Math.round(cashDue * 100))
  const metadata = {
    flow: "booking_fee_payment",
    booking_id: bookingId,
    sitter_id: user.id,
    requested_points: String(pointsToApply),
  }

  const session = await stripe.checkout.sessions.create(
    {
      ui_mode: "embedded",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${listingTitle} service fees`,
              description: "Service and cleaning fees for your booking",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      redirect_on_completion: "never",
      metadata,
      payment_intent_data: {
        metadata,
      },
    },
    {
      idempotencyKey: `booking:${bookingId}:fee-checkout:${unitAmount}:points:${pointsToApply}`,
    },
  )

  if (!session.client_secret) {
    return { error: "Stripe checkout session is missing a client secret", clientSecret: null }
  }

  return { error: null, clientSecret: session.client_secret }
}
