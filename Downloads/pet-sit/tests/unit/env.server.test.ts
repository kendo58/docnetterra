import { describe, expect, it, vi } from "vitest"

describe("server env helpers", () => {
  it("uses default uploads bucket when SUPABASE_STORAGE_BUCKET is empty", async () => {
    vi.resetModules()
    const previous = process.env.SUPABASE_STORAGE_BUCKET
    process.env.SUPABASE_STORAGE_BUCKET = "   "

    const { getServerEnv } = await import("@/lib/env/server")
    expect(getServerEnv().SUPABASE_STORAGE_BUCKET).toBe("uploads")

    if (previous === undefined) {
      delete process.env.SUPABASE_STORAGE_BUCKET
    } else {
      process.env.SUPABASE_STORAGE_BUCKET = previous
    }
  })

  it("parses ALLOW_MANUAL_BOOKING_PAYMENTS boolean values", async () => {
    vi.resetModules()
    const previous = process.env.ALLOW_MANUAL_BOOKING_PAYMENTS
    process.env.ALLOW_MANUAL_BOOKING_PAYMENTS = "yes"

    const { getServerEnv } = await import("@/lib/env/server")
    expect(getServerEnv().ALLOW_MANUAL_BOOKING_PAYMENTS).toBe(true)

    vi.resetModules()
    process.env.ALLOW_MANUAL_BOOKING_PAYMENTS = "0"
    const { getServerEnv: getServerEnvAgain } = await import("@/lib/env/server")
    expect(getServerEnvAgain().ALLOW_MANUAL_BOOKING_PAYMENTS).toBe(false)

    if (previous === undefined) {
      delete process.env.ALLOW_MANUAL_BOOKING_PAYMENTS
    } else {
      process.env.ALLOW_MANUAL_BOOKING_PAYMENTS = previous
    }
  })
})
