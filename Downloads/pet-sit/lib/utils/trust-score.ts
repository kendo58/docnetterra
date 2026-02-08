interface TrustScoreFactors {
  emailVerified: boolean
  phoneVerified: boolean
  identityVerified: boolean
  backgroundCheckPassed: boolean
  hasReferences: number
  completedBookings: number
  averageRating: number | null
  responseRate: number | null
  profileCompleteness: number
}

export function calculateTrustScore(factors: TrustScoreFactors): number {
  let score = 0

  // Email verification (10 points)
  if (factors.emailVerified) score += 10

  // Phone verification (10 points)
  if (factors.phoneVerified) score += 10

  // Identity verification (20 points)
  if (factors.identityVerified) score += 20

  // Background check (25 points)
  if (factors.backgroundCheckPassed) score += 25

  // References (15 points max, 5 per reference up to 3)
  score += Math.min(factors.hasReferences * 5, 15)

  // Completed bookings (10 points max, 2 per booking up to 5)
  score += Math.min(factors.completedBookings * 2, 10)

  // Average rating (10 points max)
  if (factors.averageRating) {
    score += (factors.averageRating / 5) * 10
  }

  return Math.round(score)
}

export function getTrustLevel(score: number): {
  level: "new" | "basic" | "verified" | "trusted" | "superhost"
  color: string
  label: string
} {
  if (score >= 85) return { level: "superhost", color: "text-purple-600", label: "Superhost" }
  if (score >= 70) return { level: "trusted", color: "text-green-600", label: "Highly Trusted" }
  if (score >= 50) return { level: "verified", color: "text-blue-600", label: "Verified" }
  if (score >= 25) return { level: "basic", color: "text-slate-600", label: "Basic Verification" }
  return { level: "new", color: "text-slate-400", label: "New Member" }
}
