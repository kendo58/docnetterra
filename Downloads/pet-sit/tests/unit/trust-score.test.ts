import { describe, expect, it } from "vitest"
import { calculateTrustScore, getTrustLevel } from "@/lib/utils/trust-score"

describe("trust score", () => {
  it("calculates and buckets trust levels", () => {
    const score = calculateTrustScore({
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      backgroundCheckPassed: true,
      hasReferences: 3,
      completedBookings: 10,
      averageRating: 5,
      responseRate: null,
      profileCompleteness: 100,
    })

    expect(score).toBeGreaterThanOrEqual(80)
    expect(getTrustLevel(score).level).toMatch(/trusted|superhost/)
  })
})

