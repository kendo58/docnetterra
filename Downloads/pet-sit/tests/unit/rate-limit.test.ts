import { afterEach, describe, expect, it, vi } from "vitest"

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  vi.resetModules()
  vi.clearAllMocks()
})

describe("checkRateLimit fallback behavior", () => {
  it("fails open outside production when limiter backend is unavailable", async () => {
    process.env.NODE_ENV = "development"
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => {
        throw new Error("backend down")
      },
    }))

    const { checkRateLimit } = await import("@/lib/rate-limit")
    const result = await checkRateLimit({ key: "test", limit: 10, windowSeconds: 60 })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(10)
  })

  it("fails closed in production when limiter backend is unavailable", async () => {
    process.env.NODE_ENV = "production"
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => {
        throw new Error("backend down")
      },
    }))

    const { checkRateLimit } = await import("@/lib/rate-limit")
    const result = await checkRateLimit({ key: "test", limit: 10, windowSeconds: 60 })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
