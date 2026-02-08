import { describe, expect, it } from "vitest"
import { calculateRelevanceScore, rankListings } from "@/lib/utils/listing-ranking"

describe("listing ranking", () => {
  it("prefers exact city/state matches", () => {
    const listing = { id: "1", address: { city: "Seattle", state: "WA" } }
    const score = calculateRelevanceScore(listing, { city: "Seattle", state: "WA" })
    expect(score).toBeGreaterThanOrEqual(50)
  })

  it("ranks higher-scored listings first", () => {
    const listings = [
      { id: "a", address: { city: "Portland", state: "OR" } },
      { id: "b", address: { city: "Seattle", state: "WA" } },
    ]
    const ranked = rankListings(listings, { city: "Seattle", state: "WA" })
    expect(ranked[0].id).toBe("b")
  })
})
