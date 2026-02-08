import { beforeEach, describe, expect, it, vi } from "vitest"

const checkRateLimitMock = vi.fn()
const cacheGetMock = vi.fn()
const cacheSetMock = vi.fn()
const geocodeLocationServerMock = vi.fn()

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}))

vi.mock("@/lib/cache/kv", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
}))

vi.mock("@/lib/utils/geocoding", () => ({
  geocodeLocationServer: geocodeLocationServerMock,
}))

describe("/api/geocode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      resetAt: new Date(Date.now() + 60_000),
    })
    cacheGetMock.mockResolvedValue(null)
    cacheSetMock.mockResolvedValue(undefined)
  })

  it("returns 500 when geocoder throws unexpectedly", async () => {
    geocodeLocationServerMock.mockRejectedValue(new Error("network-down"))

    const { GET } = await import("@/app/api/geocode/route")
    const req = new Request("http://localhost/api/geocode?city=Seattle&state=WA")
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("geocode_failed")
  })
})
