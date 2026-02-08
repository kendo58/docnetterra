export type VerificationTier = "basic" | "enhanced" | "premium"

export function normalizeVerificationTier(value: unknown): VerificationTier {
  if (typeof value !== "string") return "basic"
  const tier = value.trim().toLowerCase()
  if (!tier) return "basic"

  if (tier === "premium" || tier === "platinum") return "premium"
  if (tier === "enhanced" || tier === "gold" || tier === "verified") return "enhanced"

  return "basic"
}

export function getVerificationBonusPoints(
  value: unknown,
  scheme: { enhanced: number; premium: number },
): { points: number; label: string | null; tier: VerificationTier } {
  const tier = normalizeVerificationTier(value)
  if (tier === "premium") return { tier, points: scheme.premium, label: "Premium verified" }
  if (tier === "enhanced") return { tier, points: scheme.enhanced, label: "Verified" }
  return { tier, points: 0, label: null }
}

