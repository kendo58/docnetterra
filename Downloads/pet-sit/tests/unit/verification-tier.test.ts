import { describe, expect, it } from "vitest"
import { getVerificationBonusPoints, normalizeVerificationTier } from "@/lib/utils/verification-tier"

describe("verification tier utils", () => {
  it("normalizes tiers (including legacy values)", () => {
    expect(normalizeVerificationTier(undefined)).toBe("basic")
    expect(normalizeVerificationTier("enhanced")).toBe("enhanced")
    expect(normalizeVerificationTier("gold")).toBe("enhanced")
    expect(normalizeVerificationTier("premium")).toBe("premium")
    expect(normalizeVerificationTier("platinum")).toBe("premium")
  })

  it("applies a scoring scheme for matches", () => {
    const scheme = { enhanced: 5, premium: 8 }
    expect(getVerificationBonusPoints("basic", scheme).points).toBe(0)
    expect(getVerificationBonusPoints("enhanced", scheme).points).toBe(5)
    expect(getVerificationBonusPoints("premium", scheme).points).toBe(8)
  })
})

