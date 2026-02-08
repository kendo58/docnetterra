import { describe, expect, it, vi } from "vitest"

describe("/api/cities/search", () => {
  it("returns US city matches by prefix", async () => {
    vi.resetModules()
    const { GET } = await import("@/app/api/cities/search/route")

    const res = await GET(new Request("http://localhost/api/cities/search?q=San%20Francisco"))
    expect(res.status).toBe(200)
    expect(res.headers.get("x-request-id")).toBeTruthy()

    const body = (await res.json()) as { cities?: Array<{ city: string; state: string }> }
    expect(body.cities).toBeTruthy()
    expect(body.cities).toEqual(expect.arrayContaining([{ city: "San Francisco", state: "CA" }]))
  })

  it("parses city + state from a combined query", async () => {
    vi.resetModules()
    const { GET } = await import("@/app/api/cities/search/route")

    const res = await GET(new Request("http://localhost/api/cities/search?q=Portland,%20OR&limit=10"))
    const body = (await res.json()) as { cities?: Array<{ city: string; state: string }> }

    expect(body.cities?.some((c) => c.city === "Portland" && c.state === "OR")).toBe(true)
    expect(body.cities?.every((c) => c.state === "OR")).toBe(true)
    expect(body.cities?.length).toBeLessThanOrEqual(10)
  })
})

