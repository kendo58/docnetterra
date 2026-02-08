import { describe, expect, it } from "vitest"
import { calculateSuggestedPricing, formatPrice } from "@/lib/utils/pricing"

describe("pricing utils", () => {
  it("increases pricing for premium verification and major cities", () => {
    const base = calculateSuggestedPricing({
      location: { city: "Somewhere", state: "WA" },
      experience_years: 0,
      taskComplexity: "low",
    })
    const premiumNY = calculateSuggestedPricing({
      location: { city: "New York", state: "NY" },
      verificationTier: "premium",
      experience_years: 5,
      taskComplexity: "high",
    })

    expect(premiumNY.hourly.suggested).toBeGreaterThan(base.hourly.suggested)
    expect(premiumNY.daily.suggested).toBeGreaterThan(base.daily.suggested)
  })

  it("formats prices", () => {
    expect(formatPrice(50)).toContain("$")
  })
})

