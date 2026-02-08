import { describe, expect, it } from "vitest"
import { CACHE_POLICIES } from "@/lib/cache/policies"

describe("cache policies", () => {
  it("defines non-zero geocode and search TTL values", () => {
    expect(CACHE_POLICIES.geocode.successTtlSeconds).toBeGreaterThan(0)
    expect(CACHE_POLICIES.geocode.missTtlSeconds).toBeGreaterThan(0)
    expect(CACHE_POLICIES.search.resultTtlSeconds).toBeGreaterThan(0)
  })

  it("keeps geocode success TTL longer than miss TTL", () => {
    expect(CACHE_POLICIES.geocode.successTtlSeconds).toBeGreaterThan(CACHE_POLICIES.geocode.missTtlSeconds)
  })
})

