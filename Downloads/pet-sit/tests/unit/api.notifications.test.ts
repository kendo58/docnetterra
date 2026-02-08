import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.fn()
const checkRateLimitMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}))

function createAuthedClient(userId = "00000000-0000-4000-8000-000000000001") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
      }),
    },
    from: vi.fn(),
  }
}

describe("/api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      resetAt: new Date(Date.now() + 60_000),
    })
  })

  it("returns 401 when unauthenticated", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
      from: vi.fn(),
    })

    const { GET } = await import("@/app/api/notifications/route")
    const req = new Request("http://localhost/api/notifications") as unknown as Parameters<typeof GET>[0]
    const res = await GET(req)
    expect(res.status).toBe(401)

    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 for invalid JSON PATCH bodies", async () => {
    createServerClientMock.mockResolvedValue(createAuthedClient())

    const { PATCH } = await import("@/app/api/notifications/route")
    const req = new Request("http://localhost/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    }) as unknown as Parameters<typeof PATCH>[0]
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Invalid JSON body")
  })

  it("returns 400 for invalid notification IDs", async () => {
    createServerClientMock.mockResolvedValue(createAuthedClient())

    const { PATCH } = await import("@/app/api/notifications/route")
    const req = new Request("http://localhost/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationId: "invalid-id" }),
    }) as unknown as Parameters<typeof PATCH>[0]
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Invalid notification ID")
  })

  it("returns 403 for untrusted browser origins on PATCH", async () => {
    createServerClientMock.mockResolvedValue(createAuthedClient())

    const { PATCH } = await import("@/app/api/notifications/route")
    const req = new Request("http://localhost/api/notifications", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ notificationId: "00000000-0000-4000-8000-000000000123" }),
    }) as unknown as Parameters<typeof PATCH>[0]
    const res = await PATCH(req)

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("forbidden_origin")
  })
})
