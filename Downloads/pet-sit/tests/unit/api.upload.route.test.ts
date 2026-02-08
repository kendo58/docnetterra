import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const checkRateLimitMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}))

describe("/api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001" },
          },
        }),
      },
    })
    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(),
      },
    })
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      resetAt: new Date(Date.now() + 60_000),
    })
  })

  it("returns 403 for untrusted browser origins on POST", async () => {
    const { POST } = await import("@/app/api/upload/route")
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: new FormData(),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)

    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("forbidden_origin")
  })
})
