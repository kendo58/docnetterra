import { beforeEach, describe, expect, it, vi } from "vitest"

const createAdminClientMock = vi.fn()
const constructEventMock = vi.fn()
const getServerEnvMock = vi.fn()
const logErrorMock = vi.fn()
const logMock = vi.fn()
const captureServerExceptionMock = vi.fn()
const enqueueEmailNotificationMock = vi.fn()
const buildEmailContentMock = vi.fn()
const initialNodeEnv = process.env.NODE_ENV

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }),
}))

vi.mock("@/lib/env/server", () => ({
  getServerEnv: getServerEnvMock,
}))

vi.mock("@/lib/jobs/queue", () => ({
  enqueueEmailNotification: enqueueEmailNotificationMock,
}))

vi.mock("@/lib/email/templates", () => ({
  buildEmailContent: buildEmailContentMock.mockImplementation(() => ({
    subject: "subject",
    html: "<p>ok</p>",
    previewText: "ok",
  })),
}))

vi.mock("@/lib/observability/logger", () => ({
  log: logMock,
  logError: logErrorMock,
}))

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: captureServerExceptionMock,
}))

type BookingRow = {
  id: string
  sitter_id: string
  status: string
  payment_status: string | null
  start_date: string
  end_date: string
  service_fee_per_night: number
  cleaning_fee: number
  insurance_cost: number
  stripe_payment_intent_id: string | null
  payment_method: string | null
  paid_at: string | null
  updated_at: string | null
  listing: {
    title: string
    user: {
      id: string
      email: string
      full_name: string
    }
  }
  sitter: {
    id: string
    email: string
    full_name: string
  }
}

type WebhookDbState = {
  bookings: Map<string, BookingRow>
  webhookEvents: Set<string>
  pointsLedgerByUser: Map<string, number[]>
  notifications: unknown[]
  rpcCalls: Record<string, unknown>[]
  webhookInsertErrorCode?: string
  failPointsLedgerSelectOnce?: boolean
}

function createEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "evt_test",
    type: "payment_intent.succeeded",
    created: 1_700_000_000,
    data: {
      object: {
        id: "pi_test",
        amount_received: 30_000,
        currency: "usd",
        metadata: {
          booking_id: "booking_1",
          flow: "booking_fee_payment",
          requested_points: "0",
        },
      },
    },
    ...overrides,
  }
}

function createBooking(id = "booking_1"): BookingRow {
  return {
    id,
    sitter_id: "sitter_1",
    status: "confirmed",
    payment_status: "unpaid",
    start_date: "2026-03-01",
    end_date: "2026-03-03",
    service_fee_per_night: 50,
    cleaning_fee: 200,
    insurance_cost: 0,
    stripe_payment_intent_id: null,
    payment_method: null,
    paid_at: null,
    updated_at: "2026-02-01T00:00:00.000Z",
    listing: {
      title: "Lake House",
      user: {
        id: "homeowner_1",
        email: "homeowner@example.com",
        full_name: "Home Owner",
      },
    },
    sitter: {
      id: "sitter_1",
      email: "sitter@example.com",
      full_name: "Sitter User",
    },
  }
}

function createWebhookState(overrides: Partial<WebhookDbState> = {}): WebhookDbState {
  const booking = createBooking()
  const defaultState: WebhookDbState = {
    bookings: new Map([[booking.id, booking]]),
    webhookEvents: new Set<string>(),
    pointsLedgerByUser: new Map([[booking.sitter_id, []]]),
    notifications: [],
    rpcCalls: [],
  }

  return {
    ...defaultState,
    ...overrides,
  }
}

function createBookingUpdateBuilder(state: WebhookDbState, patch: Record<string, unknown>) {
  const eqFilters: Array<[string, unknown]> = []
  const neqFilters: Array<[string, unknown]> = []
  const isFilters: Array<[string, unknown]> = []
  let applied = false

  function matchesFilters(booking: BookingRow) {
    const passesEq = eqFilters.every(([column, value]) => (booking as Record<string, unknown>)[column] === value)
    if (!passesEq) return false

    const passesNeq = neqFilters.every(([column, value]) => (booking as Record<string, unknown>)[column] !== value)
    if (!passesNeq) return false

    const passesIs = isFilters.every(([column, value]) => {
      if (value === null) return (booking as Record<string, unknown>)[column] == null
      return (booking as Record<string, unknown>)[column] === value
    })
    if (!passesIs) return false

    return true
  }

  async function apply() {
    if (applied) return { error: null }
    applied = true

    for (const booking of state.bookings.values()) {
      if (!matchesFilters(booking)) continue
      Object.assign(booking, patch)
    }

    return { error: null }
  }

  const builder: Record<string, unknown> = {
    eq(column: string, value: unknown) {
      eqFilters.push([column, value])
      return builder
    },
    neq(column: string, value: unknown) {
      neqFilters.push([column, value])
      return builder
    },
    is(column: string, value: unknown) {
      isFilters.push([column, value])
      return apply()
    },
    then(onFulfilled?: (value: { error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return apply().then(onFulfilled, onRejected)
    },
  }

  return builder
}

function createAdminClientForWebhookInsertError(code: string) {
  const state = createWebhookState({ webhookInsertErrorCode: code })
  return createMockAdminClient(state)
}

function createMockAdminClient(state: WebhookDbState) {
  const from = vi.fn((table: string) => {
    if (table === "stripe_webhook_events") {
      return {
        insert: vi.fn(async (row: { event_id: string }) => {
          if (state.webhookInsertErrorCode) {
            return { error: { code: state.webhookInsertErrorCode, message: "simulated error" } }
          }
          if (state.webhookEvents.has(row.event_id)) {
            return { error: { code: "23505", message: "duplicate key value violates unique constraint" } }
          }
          state.webhookEvents.add(row.event_id)
          return { error: null }
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async (_column: string, eventId: string) => {
            state.webhookEvents.delete(eventId)
            return { error: null }
          }),
        })),
      }
    }

    if (table === "bookings") {
      return {
        select: vi.fn((_columns: string) => ({
          eq: vi.fn((column: string, value: string) => ({
            maybeSingle: vi.fn(async () => {
              if (column === "id") {
                return { data: state.bookings.get(value) ?? null, error: null }
              }

              if (column === "stripe_payment_intent_id") {
                const byIntent =
                  [...state.bookings.values()].find((booking) => booking.stripe_payment_intent_id === value) ?? null
                return { data: byIntent, error: null }
              }

              return { data: null, error: null }
            }),
          })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => createBookingUpdateBuilder(state, patch)),
      }
    }

    if (table === "points_ledger") {
      return {
        select: vi.fn((_columns: string) => ({
          eq: vi.fn(async (_column: string, userId: string) => {
            if (state.failPointsLedgerSelectOnce) {
              state.failPointsLedgerSelectOnce = false
              return { data: null, error: { code: "57014", message: "temporary query timeout" } }
            }

            const entries = (state.pointsLedgerByUser.get(userId) ?? []).map((points_delta) => ({ points_delta }))
            return { data: entries, error: null }
          }),
        })),
        insert: vi.fn(async () => ({ error: null })),
      }
    }

    if (table === "notifications") {
      return {
        insert: vi.fn(async (rows: unknown[]) => {
          state.notifications.push(...rows)
          return { error: null }
        }),
      }
    }

    return {
      insert: vi.fn(async () => ({ error: null })),
      update: vi.fn(() => createBookingUpdateBuilder(state, {})),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    }
  })

  return {
    from,
    rpc: vi.fn((_name: string, args: Record<string, unknown>) => ({
      maybeSingle: vi.fn(async () => {
        state.rpcCalls.push(args)
        const bookingId = String(args.p_booking_id)
        const booking = state.bookings.get(bookingId)
        if (booking) {
          booking.payment_status = "paid"
          booking.paid_at = String(args.p_paid_at)
        }
        return {
          data: {
            updated: true,
            already_paid: false,
            points_applied: 0,
            cash_due: 300,
          },
          error: null,
        }
      }),
    })),
  }
}

async function invokeWebhook(body = "{}") {
  const { POST } = await import("@/app/api/stripe/webhook/route")
  return POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body,
    }),
  )
}

describe("/api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = initialNodeEnv
    getServerEnvMock.mockReturnValue({ STRIPE_WEBHOOK_SECRET: "whsec_test" })
    constructEventMock.mockReturnValue(createEvent())
    createAdminClientMock.mockReturnValue(createMockAdminClient(createWebhookState()))
  })

  it("returns 400 when stripe-signature header is missing", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("missing_signature")
  })

  it("returns 503 when webhook secret is not configured", async () => {
    getServerEnvMock.mockReturnValue({ STRIPE_WEBHOOK_SECRET: undefined })

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error).toBe("webhook_not_configured")
  })

  it("fails closed in production when webhook dedupe table is missing", async () => {
    process.env.NODE_ENV = "production"
    createAdminClientMock.mockReturnValue(createAdminClientForWebhookInsertError("42P01"))

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("webhook_processing_failed")
    expect(logErrorMock).toHaveBeenCalled()
    expect(captureServerExceptionMock).toHaveBeenCalled()
  })

  it("continues in non-production when webhook dedupe table is missing", async () => {
    process.env.NODE_ENV = "development"
    createAdminClientMock.mockReturnValue(createAdminClientForWebhookInsertError("42P01"))

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.received).toBe(true)
  })

  it("finalizes booking fee payment on valid signed payment_intent success", async () => {
    const state = createWebhookState()
    createAdminClientMock.mockReturnValue(createMockAdminClient(state))
    constructEventMock.mockReturnValue(createEvent())

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.received).toBe(true)
    expect(body.finalized).toBe(true)
    expect(body.booking_fee_flow).toBe(true)
    expect(state.webhookEvents.has("evt_test")).toBe(true)
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.notifications.length).toBeGreaterThanOrEqual(1)
  })

  it("returns duplicate=true for replayed webhook events", async () => {
    const state = createWebhookState()
    createAdminClientMock.mockReturnValue(createMockAdminClient(state))
    constructEventMock.mockReturnValue(createEvent())

    const first = await invokeWebhook("{}")
    const second = await invokeWebhook("{}")

    expect(first.status).toBe(200)
    expect((await first.json()).finalized).toBe(true)
    expect(second.status).toBe(200)
    expect((await second.json()).duplicate).toBe(true)
  })

  it("refuses finalize when payment currency is not USD", async () => {
    const state = createWebhookState()
    createAdminClientMock.mockReturnValue(createMockAdminClient(state))
    constructEventMock.mockReturnValue(
      createEvent({
        data: {
          object: {
            id: "pi_test",
            amount_received: 30_000,
            currency: "eur",
            metadata: {
              booking_id: "booking_1",
              flow: "booking_fee_payment",
              requested_points: "0",
            },
          },
        },
      }),
    )

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.finalized).toBe(false)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("refuses finalize when Stripe amount is below expected cash due", async () => {
    const state = createWebhookState()
    createAdminClientMock.mockReturnValue(createMockAdminClient(state))
    constructEventMock.mockReturnValue(
      createEvent({
        data: {
          object: {
            id: "pi_test",
            amount_received: 29_900,
            currency: "usd",
            metadata: {
              booking_id: "booking_1",
              flow: "booking_fee_payment",
              requested_points: "0",
            },
          },
        },
      }),
    )

    const res = await invokeWebhook("{}")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.finalized).toBe(false)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("releases dedupe record after transient failure so retry can succeed", async () => {
    const state = createWebhookState({ failPointsLedgerSelectOnce: true })
    createAdminClientMock.mockReturnValue(createMockAdminClient(state))
    constructEventMock.mockReturnValue(createEvent())

    const first = await invokeWebhook("{}")
    const firstBody = await first.json()

    expect(first.status).toBe(500)
    expect(firstBody.error).toBe("webhook_processing_failed")
    expect(state.webhookEvents.has("evt_test")).toBe(false)

    const second = await invokeWebhook("{}")
    const secondBody = await second.json()

    expect(second.status).toBe(200)
    expect(secondBody.finalized).toBe(true)
    expect(secondBody.duplicate).toBeUndefined()
  })
})
