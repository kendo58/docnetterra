import { describe, expect, it, vi } from "vitest"

describe("getPublicEnv()", () => {
  it("throws when required env vars are missing", async () => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { getPublicEnv } = await import("@/lib/env/public")
    expect(() => getPublicEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/i)
    expect(() => getPublicEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_ANON_KEY/i)
  })

  it("returns parsed values and defaults", async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.NEXT_PUBLIC_ADMIN_APP_URL = "https://admin.example.com"
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST

    const { getPublicEnv } = await import("@/lib/env/public")
    const env = getPublicEnv()

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co")
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon")
    expect(env.NEXT_PUBLIC_ADMIN_APP_URL).toBe("https://admin.example.com")
    expect(env.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://app.posthog.com")
  })
})
