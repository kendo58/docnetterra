import { describe, expect, it } from "vitest"
import {
  deriveBookingPaymentPatch,
  extractAmountReceivedCentsFromEvent,
  extractCurrencyFromEvent,
  extractEventMetadata,
  extractBookingIdFromEvent,
  extractPaymentFlowFromEvent,
  extractPaymentIntentIdFromEvent,
  extractRequestedPointsFromEvent,
  isSupportedStripeWebhookEvent,
  type StripeEventLike,
} from "@/lib/payments/stripe-webhooks"

function createEvent(overrides: Partial<StripeEventLike>): StripeEventLike {
  return {
    id: "evt_test",
    type: "payment_intent.succeeded",
    created: 1_700_000_000,
    data: {
      object: {},
    },
    ...overrides,
  }
}

describe("stripe webhook helpers", () => {
  it("identifies supported event types", () => {
    expect(isSupportedStripeWebhookEvent("payment_intent.succeeded")).toBe(true)
    expect(isSupportedStripeWebhookEvent("charge.refunded")).toBe(true)
    expect(isSupportedStripeWebhookEvent("customer.created")).toBe(false)
  })

  it("extracts payment intent IDs from payment_intent and checkout events", () => {
    const paymentIntentEvent = createEvent({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_123" } },
    })
    const checkoutEvent = createEvent({
      type: "checkout.session.completed",
      data: { object: { payment_intent: "pi_456" } },
    })

    expect(extractPaymentIntentIdFromEvent(paymentIntentEvent)).toBe("pi_123")
    expect(extractPaymentIntentIdFromEvent(checkoutEvent)).toBe("pi_456")
  })

  it("extracts booking IDs from metadata", () => {
    const event = createEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          metadata: { booking_id: "booking_1" },
        },
      },
    })

    expect(extractBookingIdFromEvent(event)).toBe("booking_1")
  })

  it("extracts payment flow, metadata, and requested points from metadata", () => {
    const event = createEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            booking_id: "booking_2",
            flow: "booking_fee_payment",
            requested_points: "3",
          },
        },
      },
    })

    const metadata = extractEventMetadata(event)
    expect(metadata?.booking_id).toBe("booking_2")
    expect(extractPaymentFlowFromEvent(event)).toBe("booking_fee_payment")
    expect(extractRequestedPointsFromEvent(event)).toBe(3)
  })

  it("normalizes invalid requested_points metadata to zero", () => {
    const event = createEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          metadata: {
            requested_points: "abc",
          },
        },
      },
    })

    expect(extractRequestedPointsFromEvent(event)).toBe(0)
  })

  it("extracts amount and currency from payment_intent events", () => {
    const event = createEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          amount_received: 12_500,
          currency: "USD",
        },
      },
    })

    expect(extractAmountReceivedCentsFromEvent(event)).toBe(12_500)
    expect(extractCurrencyFromEvent(event)).toBe("usd")
  })

  it("extracts checkout amount total and handles invalid amount payloads", () => {
    const checkout = createEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          payment_intent: "pi_456",
          amount_total: 9_900,
          currency: "usd",
        },
      },
    })
    const invalid = createEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          amount_received: "not-a-number",
          currency: 100,
        },
      },
    })

    expect(extractAmountReceivedCentsFromEvent(checkout)).toBe(9_900)
    expect(extractAmountReceivedCentsFromEvent(invalid)).toBeNull()
    expect(extractCurrencyFromEvent(invalid)).toBeNull()
  })

  it("maps payment_intent success to paid status", () => {
    const event = createEvent({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_123" } },
    })
    const patch = deriveBookingPaymentPatch(event)

    expect(patch?.payment_status).toBe("paid")
    expect(typeof patch?.paid_at).toBe("string")
  })

  it("maps failed intents to unpaid and refunded charges to refunded", () => {
    const failed = createEvent({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_123" } },
    })
    const refunded = createEvent({
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_123" } },
    })

    expect(deriveBookingPaymentPatch(failed)).toEqual({ payment_status: "unpaid" })
    expect(deriveBookingPaymentPatch(refunded)?.payment_status).toBe("refunded")
  })
})
