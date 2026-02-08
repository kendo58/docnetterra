import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.fn()
const checkRateLimitMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}))

describe("/api/reviews validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      resetAt: new Date(Date.now() + 60_000),
    })
  })

  it("rejects review text shorter than the minimum length", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001" },
          },
        }),
      },
      from: vi.fn(),
    })

    const form = new FormData()
    form.set("bookingId", "00000000-0000-4000-8000-000000000002")
    form.set("revieweeId", "00000000-0000-4000-8000-000000000003")
    form.set("rating", "5")
    form.set("communication_rating", "5")
    form.set("accuracy_rating", "5")
    form.set("cleanliness_rating", "5")
    form.set("responsibility_rating", "5")
    form.set("review_text", "bad")
    form.set("would_recommend", "true")

    const { POST } = await import("@/app/api/reviews/route")
    const req = new Request("http://localhost/api/reviews", {
      method: "POST",
      body: form,
    }) as unknown as Parameters<typeof POST>[0]

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Review text must be between 5 and 2000 characters")
  })

  it("rejects invalid UUIDs for review payload identifiers", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001" },
          },
        }),
      },
      from: vi.fn(),
    })

    const form = new FormData()
    form.set("bookingId", "not-a-uuid")
    form.set("revieweeId", "00000000-0000-4000-8000-000000000003")
    form.set("rating", "5")
    form.set("communication_rating", "5")
    form.set("accuracy_rating", "5")
    form.set("cleanliness_rating", "5")
    form.set("responsibility_rating", "5")
    form.set("review_text", "Great and reliable experience.")
    form.set("would_recommend", "true")

    const { POST } = await import("@/app/api/reviews/route")
    const req = new Request("http://localhost/api/reviews", {
      method: "POST",
      body: form,
    }) as unknown as Parameters<typeof POST>[0]

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Invalid booking or user identifier")
  })

  it("rejects invalid UUIDs for review listing requests", async () => {
    createServerClientMock.mockResolvedValue({
      from: vi.fn(),
    })

    const { GET } = await import("@/app/api/reviews/route")
    const req = new Request("http://localhost/api/reviews?userId=bad-id") as unknown as Parameters<typeof GET>[0]
    const res = await GET(req)

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Invalid user ID")
  })

  it("rejects write requests from untrusted browser origins", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001" },
          },
        }),
      },
      from: vi.fn(),
    })

    const form = new FormData()
    form.set("bookingId", "00000000-0000-4000-8000-000000000002")
    form.set("revieweeId", "00000000-0000-4000-8000-000000000003")
    form.set("rating", "5")
    form.set("communication_rating", "5")
    form.set("accuracy_rating", "5")
    form.set("cleanliness_rating", "5")
    form.set("responsibility_rating", "5")
    form.set("review_text", "Great and reliable experience.")
    form.set("would_recommend", "true")

    const { POST } = await import("@/app/api/reviews/route")
    const req = new Request("http://localhost/api/reviews", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: form,
    }) as unknown as Parameters<typeof POST>[0]

    const res = await POST(req)
    expect(res.status).toBe(403)

    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("forbidden_origin")
  })
})
