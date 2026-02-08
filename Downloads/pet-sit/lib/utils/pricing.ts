interface PricingFactors {
  location: { city: string; state: string }
  experience_years?: number
  averageRating?: number
  numberOfReviews?: number
  verificationTier?: string
  petTypes?: string[]
  taskComplexity?: "low" | "medium" | "high"
}

const BASE_RATES = {
  hourly: 15,
  daily: 50,
  weekly: 300,
}

const LOCATION_MULTIPLIERS: Record<string, number> = {
  // Major cities
  "New York": 1.5,
  "San Francisco": 1.6,
  "Los Angeles": 1.4,
  Seattle: 1.3,
  Boston: 1.3,
  Chicago: 1.2,
  Austin: 1.2,
  // Default for other cities
  default: 1.0,
}

export function calculateSuggestedPricing(factors: PricingFactors) {
  let hourlyMultiplier = 1.0
  let dailyMultiplier = 1.0

  // Location adjustment
  const cityMultiplier = LOCATION_MULTIPLIERS[factors.location.city] || LOCATION_MULTIPLIERS.default
  hourlyMultiplier *= cityMultiplier
  dailyMultiplier *= cityMultiplier

  // Experience adjustment (up to 50% increase)
  if (factors.experience_years) {
    const experienceBonus = Math.min(factors.experience_years * 0.05, 0.5)
    hourlyMultiplier *= 1 + experienceBonus
    dailyMultiplier *= 1 + experienceBonus
  }

  // Rating adjustment (up to 30% increase)
  if (factors.averageRating && factors.numberOfReviews && factors.numberOfReviews >= 5) {
    const ratingBonus = ((factors.averageRating - 3) / 2) * 0.3
    if (ratingBonus > 0) {
      hourlyMultiplier *= 1 + ratingBonus
      dailyMultiplier *= 1 + ratingBonus
    }
  }

  // Verification tier bonus
  if (factors.verificationTier === "premium") {
    hourlyMultiplier *= 1.15
    dailyMultiplier *= 1.15
  } else if (factors.verificationTier === "enhanced") {
    hourlyMultiplier *= 1.1
    dailyMultiplier *= 1.1
  }

  // Task complexity adjustment
  if (factors.taskComplexity === "high") {
    hourlyMultiplier *= 1.3
    dailyMultiplier *= 1.2
  } else if (factors.taskComplexity === "medium") {
    hourlyMultiplier *= 1.15
    dailyMultiplier *= 1.1
  }

  // Pet type adjustments (exotic pets command higher rates)
  const hasExoticPets = factors.petTypes?.some((type) => ["bird", "reptile", "exotic"].includes(type.toLowerCase()))
  if (hasExoticPets) {
    hourlyMultiplier *= 1.2
    dailyMultiplier *= 1.15
  }

  const suggestedHourly = Math.round(BASE_RATES.hourly * hourlyMultiplier)
  const suggestedDaily = Math.round(BASE_RATES.daily * dailyMultiplier)
  const suggestedWeekly = Math.round(suggestedDaily * 6.5) // Slight discount for weekly

  return {
    hourly: {
      min: Math.round(suggestedHourly * 0.8),
      suggested: suggestedHourly,
      max: Math.round(suggestedHourly * 1.3),
    },
    daily: {
      min: Math.round(suggestedDaily * 0.8),
      suggested: suggestedDaily,
      max: Math.round(suggestedDaily * 1.3),
    },
    weekly: {
      min: Math.round(suggestedWeekly * 0.8),
      suggested: suggestedWeekly,
      max: Math.round(suggestedWeekly * 1.3),
    },
    factors: {
      locationMultiplier: cityMultiplier,
      experienceBonus: factors.experience_years ? Math.min(factors.experience_years * 0.05, 0.5) : 0,
      totalMultiplier: hourlyMultiplier,
    },
  }
}

export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
