import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enqueueEmailNotification } from "@/lib/jobs/queue"
import { buildEmailContent } from "@/lib/email/templates"
import { calculateBookingFees, clampPoints } from "@/lib/pricing/fees"
import { getStripe } from "@/lib/stripe"
import { getServerEnv } from "@/lib/env/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { log, logError } from "@/lib/observability/logger"
import {
  deriveBookingPaymentPatch,
  extractAmountReceivedCentsFromEvent,
  extractBookingIdFromEvent,
  extractCurrencyFromEvent,
  extractPaymentFlowFromEvent,
  extractPaymentIntentIdFromEvent,
  extractRequestedPointsFromEvent,
  getStripeEventIsoTimestamp,
  isSupportedStripeWebhookEvent,
  type StripeEventLike,
} from "@/lib/payments/stripe-webhooks"
import { hasPostgresCode } from "@/lib/utils/supabase-errors"

export const runtime = "nodejs"

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

type BookingFinalizeRow = {
  id: string
  sitter_id: string
  status: string
  payment_status: string | null
  start_date: string
  end_date: string
  service_fee_per_night: number | null
  cleaning_fee: number | null
  insurance_cost: number | null
}

type ProfileRef = {
  id?: string | null
  email?: string | null
  full_name?: string | null
}

type ListingRef = {
  title?: string | null
  user?: ProfileRef | ProfileRef[] | null
}

type BookingNotifyRow = {
  id: string
  sitter_id: string
  start_date: string
  end_date: string
  paid_at: string | null
  updated_at: string | null
  listing: ListingRef | ListingRef[] | null
  sitter: ProfileRef | ProfileRef[] | null
}

function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toOptionalFiniteNumber(value: number | null): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return value
}

function toUsdCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Math.max(0, Math.round(amount * 100))
}

function calculateTotals(booking: BookingFinalizeRow) {
  return calculateBookingFees({
    startDate: booking.start_date,
    endDate: booking.end_date,
    serviceFeePerNight: toOptionalFiniteNumber(booking.service_fee_per_night),
    cleaningFee: toOptionalFiniteNumber(booking.cleaning_fee),
    insuranceCost: toOptionalFiniteNumber(booking.insurance_cost) ?? 0,
  })
}

async function runAtomicBookingPaymentRpc(
  args: AtomicPaymentRpcArgs,
  cashPaid: number,
  requestId: string,
): Promise<AtomicPaymentResult> {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .rpc("pay_booking_with_points", {
      ...args,
      p_cash_paid: cashPaid,
    })
    .maybeSingle<AtomicPaymentResult>()

  if (!error) {
    return data ?? { updated: false, already_paid: false, points_applied: 0, cash_due: 0 }
  }

  const overloadedRpcUnavailable = hasPostgresCode(error, "42883") || hasPostgresCode(error, "PGRST202")
  if (!overloadedRpcUnavailable) {
    throw error
  }

  // Backward compatibility while the expanded RPC signature is rolling out.
  console.warn("[sitswap] pay_booking_with_points(p_cash_paid) RPC unavailable; falling back", {
    requestId,
    code: error.code,
  })

  const { data: fallbackData, error: fallbackError } = await adminSupabase
    .rpc("pay_booking_with_points", args)
    .maybeSingle<AtomicPaymentResult>()

  if (fallbackError) {
    throw fallbackError
  }

  return fallbackData ?? { updated: false, already_paid: false, points_applied: 0, cash_due: 0 }
}

async function recordWebhookEvent(event: StripeEventLike, requestId: string) {
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    payload: event,
  })

  if (!error) return { duplicate: false, recorded: true }

  if (hasPostgresCode(error, "23505")) {
    return { duplicate: true, recorded: false }
  }

  // Migration not applied yet. Keep processing, but without durable dedupe.
  if (hasPostgresCode(error, "42P01")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[sitswap] stripe_webhook_events table missing in production")
    }
    console.warn("[sitswap] stripe_webhook_events table missing; processing without dedupe", { requestId })
    return { duplicate: false, recorded: false }
  }

  throw error
}

async function releaseRecordedWebhookEvent(eventId: string, requestId: string) {
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("stripe_webhook_events").delete().eq("event_id", eventId)
  if (!error || hasPostgresCode(error, "42P01")) return
  console.warn("[sitswap] Failed to release Stripe webhook dedupe record after processing failure", {
    eventId,
    requestId,
    code: error.code,
    message: error.message,
  })
}

async function linkBookingToPaymentIntent(bookingId: string, paymentIntentId: string) {
  const adminSupabase = createAdminClient()
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select("id, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle<{ id: string; stripe_payment_intent_id: string | null }>()

  if (bookingError || !booking) return

  if (!booking.stripe_payment_intent_id) {
    await adminSupabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", bookingId)
      .is("stripe_payment_intent_id", null)
    return
  }

  if (booking.stripe_payment_intent_id !== paymentIntentId) {
    console.warn("[sitswap] Stripe webhook payment intent mismatch for booking", {
      bookingId,
      existingPaymentIntentId: booking.stripe_payment_intent_id,
      webhookPaymentIntentId: paymentIntentId,
    })
  }
}

async function applyPaymentPatch(paymentIntentId: string, patch: ReturnType<typeof deriveBookingPaymentPatch>) {
  if (!patch) return

  const adminSupabase = createAdminClient()
  let query = adminSupabase.from("bookings").update(patch).eq("stripe_payment_intent_id", paymentIntentId)

  if (patch.payment_status === "paid") {
    query = query.neq("payment_status", "paid")
  } else if (patch.payment_status === "unpaid") {
    // Never downgrade a booking that has already been marked paid.
    query = query.neq("payment_status", "paid")
  } else if (patch.payment_status === "refunded") {
    query = query.neq("payment_status", "refunded")
  }

  await query
}

async function finalizeBookingFeePayment(options: {
  bookingId: string
  paymentIntentId: string
  requestedPoints: number
  paidAt: string
  paidAmountCents: number | null
  paidCurrency: string | null
  requestId: string
}): Promise<AtomicPaymentResult> {
  const adminSupabase = createAdminClient()
  const zeroResult: AtomicPaymentResult = { updated: false, already_paid: false, points_applied: 0, cash_due: 0 }
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select(
      `
      id,
      sitter_id,
      status,
      payment_status,
      start_date,
      end_date,
      service_fee_per_night,
      cleaning_fee,
      insurance_cost
    `,
    )
    .eq("id", options.bookingId)
    .maybeSingle<BookingFinalizeRow>()

  if (bookingError) {
    console.warn("[sitswap] Stripe webhook booking lookup failed:", {
      bookingId: options.bookingId,
      error: bookingError,
      requestId: options.requestId,
    })
    throw bookingError
  }

  if (!booking) {
    console.warn("[sitswap] Stripe webhook booking not found for finalize", {
      bookingId: options.bookingId,
      requestId: options.requestId,
    })
    return zeroResult
  }

  if (!["confirmed", "accepted"].includes(booking.status)) {
    console.warn("[sitswap] Ignoring Stripe payment finalize for booking in invalid status", {
      bookingId: options.bookingId,
      status: booking.status,
      requestId: options.requestId,
    })
    return zeroResult
  }

  if (options.paidAmountCents === null) {
    console.warn("[sitswap] Stripe payment amount missing; refusing finalize", {
      bookingId: options.bookingId,
      paymentIntentId: options.paymentIntentId,
      requestId: options.requestId,
    })
    return zeroResult
  }

  if (options.paidCurrency !== "usd") {
    console.warn("[sitswap] Stripe payment currency mismatch; refusing finalize", {
      bookingId: options.bookingId,
      paymentIntentId: options.paymentIntentId,
      currency: options.paidCurrency,
      requestId: options.requestId,
    })
    return zeroResult
  }

  const totals = calculateTotals(booking)
  const normalizedRequestedPoints =
    Number.isFinite(options.requestedPoints) && options.requestedPoints > 0
      ? Math.floor(options.requestedPoints)
      : 0

  const { data: balanceRows, error: balanceError } = await adminSupabase
    .from("points_ledger")
    .select("points_delta")
    .eq("user_id", booking.sitter_id)

  if (balanceError) {
    console.warn("[sitswap] Failed reading points balance before Stripe finalize", {
      bookingId: options.bookingId,
      error: balanceError,
      requestId: options.requestId,
    })
    throw balanceError
  }

  const pointsBalance = Math.max((balanceRows ?? []).reduce((sum, row) => sum + Number(row.points_delta || 0), 0), 0)
  const pointsToApplyEstimate = clampPoints({
    requested: normalizedRequestedPoints,
    balance: pointsBalance,
    nights: totals.nights,
  })
  const expectedCashDue = Math.max(totals.totalFee - pointsToApplyEstimate * totals.serviceFeePerNight, 0)
  const expectedCashDueCents = toUsdCents(expectedCashDue)

  if (options.paidAmountCents < expectedCashDueCents) {
    console.warn("[sitswap] Stripe payment amount insufficient; refusing finalize", {
      bookingId: options.bookingId,
      paymentIntentId: options.paymentIntentId,
      expectedCashDueCents,
      paidAmountCents: options.paidAmountCents,
      requestId: options.requestId,
    })
    return zeroResult
  }

  const result = await runAtomicBookingPaymentRpc(
    {
      p_booking_id: options.bookingId,
      p_sitter_id: booking.sitter_id,
      p_requested_points: pointsToApplyEstimate,
      p_service_fee_per_night: totals.serviceFeePerNight,
      p_cleaning_fee: totals.cleaningFee,
      p_service_fee_total: totals.serviceFeeTotal,
      p_total_fee: totals.totalFee,
      p_paid_at: options.paidAt,
    },
    options.paidAmountCents / 100,
    options.requestId,
  )

  if (result.updated || result.already_paid) {
    const { error: bookingUpdateError } = await adminSupabase
      .from("bookings")
      .update({
        stripe_payment_intent_id: options.paymentIntentId,
        payment_method: "stripe",
      })
      .eq("id", options.bookingId)

    if (bookingUpdateError) {
      console.warn("[sitswap] Failed to update booking payment metadata after webhook finalize:", {
        bookingId: options.bookingId,
        paymentIntentId: options.paymentIntentId,
        error: bookingUpdateError,
        requestId: options.requestId,
      })
    }
  }

  return result
}

async function notifyBookingPaidParticipants(bookingId: string) {
  const adminSupabase = createAdminClient()
  const { data: booking } = await adminSupabase
    .from("bookings")
    .select(
      `
      id,
      sitter_id,
      start_date,
      end_date,
      paid_at,
      updated_at,
      listing:listings(
        title,
        user:profiles!listings_user_id_fkey(id, email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(id, email, full_name)
    `,
    )
    .eq("id", bookingId)
    .maybeSingle<BookingNotifyRow>()

  if (!booking) return

  const listing = toOne(booking.listing)
  const homeowner = toOne(listing?.user)
  const sitter = toOne(booking.sitter)
  const listingTitle = listing?.title ?? "Sit"

  const notifications = [
    homeowner?.id
      ? {
          user_id: homeowner.id,
          type: "booking_paid",
          title: "Payment received",
          body: "The sitter has paid the service and cleaning fees.",
          data: { booking_id: booking.id, url: `/sits/${booking.id}` },
        }
      : null,
    sitter?.id
      ? {
          user_id: sitter.id,
          type: "booking_paid",
          title: "Payment completed",
          body: "Your payment is complete. The address is now available.",
          data: { booking_id: booking.id, url: `/sits/${booking.id}` },
        }
      : null,
  ].filter(Boolean)

  if (notifications.length > 0) {
    await adminSupabase.from("notifications").insert(notifications)
  }

  const eventTime = booking.paid_at ?? booking.updated_at ?? new Date().toISOString()

  if (homeowner?.email) {
    const homeownerData = {
      bookingId: booking.id,
      listingTitle,
      sitterName: sitter?.full_name,
      startDate: booking.start_date,
      endDate: booking.end_date,
      role: "homeowner",
      eventTime,
    }
    const homeownerContent = buildEmailContent("booking_paid", homeownerData)
    try {
      await enqueueEmailNotification({
        to: homeowner.email,
        type: "booking_paid",
        data: homeownerData,
        subject: homeownerContent.subject,
        html: homeownerContent.html,
        previewText: homeownerContent.previewText,
      })
    } catch (emailError) {
      console.warn("[sitswap] Failed to enqueue homeowner booking_paid email:", emailError)
    }
  }

  if (sitter?.email) {
    const sitterData = {
      bookingId: booking.id,
      listingTitle,
      homeownerName: homeowner?.full_name,
      startDate: booking.start_date,
      endDate: booking.end_date,
      role: "sitter",
      eventTime,
    }
    const sitterContent = buildEmailContent("booking_paid", sitterData)
    try {
      await enqueueEmailNotification({
        to: sitter.email,
        type: "booking_paid",
        data: sitterData,
        subject: sitterContent.subject,
        html: sitterContent.html,
        previewText: sitterContent.previewText,
      })
    } catch (emailError) {
      console.warn("[sitswap] Failed to enqueue sitter booking_paid email:", emailError)
    }
  }
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request.headers)
  let recordedEventId: string | null = null
  try {
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      return attachRequestId(NextResponse.json({ error: "missing_signature" }, { status: 400 }), requestId)
    }

    const { STRIPE_WEBHOOK_SECRET } = getServerEnv()
    if (!STRIPE_WEBHOOK_SECRET) {
      return attachRequestId(NextResponse.json({ error: "webhook_not_configured" }, { status: 503 }), requestId)
    }

    const stripe = getStripe()
    const body = await request.text()

    let stripeEvent: StripeEventLike
    try {
      const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
      stripeEvent = {
        id: event.id,
        type: event.type,
        created: event.created,
        data: {
          object: event.data.object as unknown as Record<string, unknown>,
        },
      }
    } catch {
      return attachRequestId(NextResponse.json({ error: "invalid_signature" }, { status: 400 }), requestId)
    }

    if (!isSupportedStripeWebhookEvent(stripeEvent.type)) {
      return attachRequestId(NextResponse.json({ received: true, ignored: true }), requestId)
    }

    const { duplicate, recorded } = await recordWebhookEvent(stripeEvent, requestId)
    if (recorded) recordedEventId = stripeEvent.id
    if (duplicate) {
      log("info", "api.stripe.webhook.duplicate", {
        requestId,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
      })
      return attachRequestId(NextResponse.json({ received: true, duplicate: true }), requestId)
    }

    const bookingId = extractBookingIdFromEvent(stripeEvent)
    const paymentIntentId = extractPaymentIntentIdFromEvent(stripeEvent)
    const paymentFlow = extractPaymentFlowFromEvent(stripeEvent)
    const requestedPoints = extractRequestedPointsFromEvent(stripeEvent)
    const paidAmountCents = extractAmountReceivedCentsFromEvent(stripeEvent)
    const paidCurrency = extractCurrencyFromEvent(stripeEvent)

    if (bookingId && paymentIntentId) {
      await linkBookingToPaymentIntent(bookingId, paymentIntentId)
    }

    const isPaymentIntentSucceeded = stripeEvent.type === "payment_intent.succeeded"
    const isCheckoutCompleted = stripeEvent.type === "checkout.session.completed"
    const isSuccessEvent = isPaymentIntentSucceeded || isCheckoutCompleted
    const isBookingFeePaymentFlow = paymentFlow === "booking_fee_payment"

    if (isBookingFeePaymentFlow && isPaymentIntentSucceeded && bookingId && paymentIntentId) {
      const result = await finalizeBookingFeePayment({
        bookingId,
        paymentIntentId,
        requestedPoints,
        paidAt: getStripeEventIsoTimestamp(stripeEvent.created),
        paidAmountCents,
        paidCurrency,
        requestId,
      })

      if (result.updated) {
        await notifyBookingPaidParticipants(bookingId)
      }

      log("info", "api.stripe.webhook.booking_fee_finalize", {
        requestId,
        eventId: stripeEvent.id,
        bookingId,
        paymentIntentId,
        paidAmountCents,
        paidCurrency,
        finalized: result.updated || result.already_paid,
        pointsApplied: result.points_applied,
        cashDue: result.cash_due,
      })

      return attachRequestId(
        NextResponse.json({
          received: true,
          finalized: result.updated || result.already_paid,
          booking_fee_flow: true,
        }),
        requestId,
      )
    }

    const patch = deriveBookingPaymentPatch(stripeEvent)
    const skipGenericPatch = isBookingFeePaymentFlow && isSuccessEvent
    if (patch && paymentIntentId && !skipGenericPatch) {
      await applyPaymentPatch(paymentIntentId, patch)
      log("info", "api.stripe.webhook.patch_applied", {
        requestId,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
        paymentIntentId,
        paymentStatus: patch.payment_status,
      })
    }

    return attachRequestId(NextResponse.json({ received: true }), requestId)
  } catch (error) {
    if (recordedEventId) {
      await releaseRecordedWebhookEvent(recordedEventId, requestId)
    }
    logError("api.stripe.webhook_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 }), requestId)
  }
}
