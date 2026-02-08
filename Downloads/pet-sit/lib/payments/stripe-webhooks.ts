type StripeEventObjectLike = Record<string, unknown>

export type StripeEventLike = {
  id: string
  type: string
  created: number
  data: {
    object: StripeEventObjectLike
  }
}

export type BookingPaymentPatch = {
  payment_status: "paid" | "unpaid" | "refunded"
  paid_at?: string
  refunded_at?: string
}

const SUPPORTED_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "checkout.session.completed",
  "charge.refunded",
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function getInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null
  }
  return value
}

function getMetadataObject(value: unknown): Record<string, unknown> | null {
  if (!isObject(value)) return null
  return value
}

function parseRequestedPoints(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

export function isSupportedStripeWebhookEvent(type: string): boolean {
  return SUPPORTED_TYPES.has(type)
}

export function getStripeEventIsoTimestamp(createdUnixSeconds: number): string {
  return new Date(Math.max(0, createdUnixSeconds) * 1000).toISOString()
}

export function extractPaymentIntentIdFromEvent(event: StripeEventLike): string | null {
  const object = event.data.object

  if (event.type.startsWith("payment_intent.")) {
    return getString(object.id)
  }

  if (event.type.startsWith("checkout.session.")) {
    return getString(object.payment_intent)
  }

  if (event.type.startsWith("charge.")) {
    return getString(object.payment_intent)
  }

  return null
}

export function extractEventMetadata(event: StripeEventLike): Record<string, unknown> | null {
  const object = event.data.object
  const metadata = getMetadataObject(object.metadata)

  return metadata
}

export function extractBookingIdFromEvent(event: StripeEventLike): string | null {
  const metadata = extractEventMetadata(event)

  if (metadata) {
    const bookingId = getString(metadata.booking_id)
    if (bookingId) return bookingId
  }

  return null
}

export function extractPaymentFlowFromEvent(event: StripeEventLike): string | null {
  const metadata = extractEventMetadata(event)
  if (!metadata) return null
  return getString(metadata.flow)
}

export function extractRequestedPointsFromEvent(event: StripeEventLike): number {
  const metadata = extractEventMetadata(event)
  if (!metadata) return 0
  return parseRequestedPoints(getString(metadata.requested_points))
}

export function extractAmountReceivedCentsFromEvent(event: StripeEventLike): number | null {
  const object = event.data.object

  if (event.type.startsWith("payment_intent.")) {
    const amountReceived = getInteger(object.amount_received)
    if (amountReceived !== null) return Math.max(0, amountReceived)

    const amount = getInteger(object.amount)
    return amount === null ? null : Math.max(0, amount)
  }

  if (event.type.startsWith("checkout.session.")) {
    const amountTotal = getInteger(object.amount_total)
    return amountTotal === null ? null : Math.max(0, amountTotal)
  }

  if (event.type.startsWith("charge.")) {
    const amount = getInteger(object.amount)
    return amount === null ? null : Math.max(0, amount)
  }

  return null
}

export function extractCurrencyFromEvent(event: StripeEventLike): string | null {
  const currency = getString(event.data.object.currency)
  return currency ? currency.toLowerCase() : null
}

export function deriveBookingPaymentPatch(event: StripeEventLike): BookingPaymentPatch | null {
  const processedAt = getStripeEventIsoTimestamp(event.created)

  switch (event.type) {
    case "payment_intent.succeeded":
      return {
        payment_status: "paid",
        paid_at: processedAt,
      }
    case "checkout.session.completed": {
      const checkoutPaymentStatus = getString(event.data.object.payment_status)
      if (checkoutPaymentStatus !== "paid") return null
      return {
        payment_status: "paid",
        paid_at: processedAt,
      }
    }
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      return {
        payment_status: "unpaid",
      }
    case "charge.refunded":
      return {
        payment_status: "refunded",
        refunded_at: processedAt,
      }
    default:
      return null
  }
}
