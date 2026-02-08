import { describe, expect, it, vi } from "vitest"

describe("/api/health", () => {
  it("returns ok when env is valid", async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { GET } = await import("@/app/api/health/route")
    const res = GET(new Request("http://localhost/api/health"))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.status).toBe("ok")
    expect(body.issues).toEqual([])
  })

  it("returns degraded when required env is missing", async () => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { GET } = await import("@/app/api/health/route")
    const res = GET(new Request("http://localhost/api/health"))
    const body = await res.json()

    expect(body.status).toBe("degraded")
    expect(body.issues).toContain("public_env_invalid")
    expect(body.issues).toContain("SUPABASE_SERVICE_ROLE_KEY_missing")
  })

  it("reports missing stripe webhook secret when stripe is configured", async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
    process.env.STRIPE_SECRET_KEY = "sk_test_example"
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { GET } = await import("@/app/api/health/route")
    const res = GET(new Request("http://localhost/api/health"))
    const body = await res.json()

    expect(body.status).toBe("degraded")
    expect(body.issues).toContain("STRIPE_WEBHOOK_SECRET_missing")
  })

  it("reports manual booking payments enabled in production", async () => {
    vi.resetModules()
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
    process.env.ALLOW_MANUAL_BOOKING_PAYMENTS = "true"

    const { GET } = await import("@/app/api/health/route")
    const res = GET(new Request("http://localhost/api/health"))
    const body = await res.json()

    expect(body.status).toBe("degraded")
    expect(body.issues).toContain("ALLOW_MANUAL_BOOKING_PAYMENTS_enabled_in_production")
    expect(body.issues).toContain("SITSWAP_WORKER_ENABLED_missing_in_production")
    process.env.NODE_ENV = originalNodeEnv
  })

  it("returns degraded when server env parsing fails", async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SENTRY_DSN = "not-a-url"

    const { GET } = await import("@/app/api/health/route")
    const res = GET(new Request("http://localhost/api/health"))
    const body = await res.json()

    expect(body.status).toBe("degraded")
    expect(body.issues).toContain("server_env_invalid")

    delete process.env.SENTRY_DSN
  })
})
