interface ListingWithDetails {
  id: string
  address?: { city?: string | null; state?: string | null; postal_code?: string | null } | null
  pets?: Array<{ species?: string | null }> | null
  tasks?: Array<{ task_type?: string | null }> | null
  [key: string]: unknown
}

interface UserPreferences {
  city?: string
  state?: string
  postal_code?: string
  petTypes?: string[]
  taskTypes?: string[]
  listingType?: string
  verified?: string
}

/**
 * Calculate relevance score for a listing based on user preferences
 * Higher score = more relevant
 */
export function calculateRelevanceScore(listing: ListingWithDetails, preferences: UserPreferences): number {
  let score = 0

  // Location matching (highest priority - 50 points possible)
  if (preferences.city && listing.address?.city) {
    const listingCity = listing.address.city.toLowerCase().trim()
    const userCity = preferences.city.toLowerCase().trim()

    if (listingCity === userCity) {
      score += 30 // Exact city match

      // State match bonus if city matches
      if (preferences.state && listing.address.state) {
        const listingState = listing.address.state.toLowerCase().trim()
        const userState = preferences.state.toLowerCase().trim()
        if (listingState === userState) {
          score += 20 // State match bonus
        }
      }
    }
  } else if (preferences.state && listing.address?.state) {
    // State only match (less priority than city)
    const listingState = listing.address.state.toLowerCase().trim()
    const userState = preferences.state.toLowerCase().trim()
    if (listingState === userState) {
      score += 15 // State-only match
    }
  }

  // Postal code proximity (for nearby locations)
  if (preferences.postal_code && listing.address?.postal_code) {
    const userZip = preferences.postal_code.substring(0, 3)
    const listingZip = listing.address.postal_code.substring(0, 3)
    if (userZip === listingZip) {
      score += 10 // Nearby postal code
    }
  }

  // Pet type matching (30 points possible)
  if (preferences.petTypes && preferences.petTypes.length > 0 && listing.pets) {
    const listingPetTypes = listing.pets
      .map((pet) => pet.species?.toLowerCase())
      .filter((type): type is string => Boolean(type))

    const matchingPets = preferences.petTypes.filter((prefType) => listingPetTypes.includes(prefType.toLowerCase()))

    if (matchingPets.length > 0) {
      // More points for more matching pet types
      score += Math.min(matchingPets.length * 15, 30)
    }
  }

  // Task type matching (20 points possible)
  if (preferences.taskTypes && preferences.taskTypes.length > 0 && listing.tasks) {
    const listingTaskTypes = listing.tasks
      .map((task) => task.task_type?.toLowerCase())
      .filter((type): type is string => Boolean(type))

    const matchingTasks = preferences.taskTypes.filter((prefType) => listingTaskTypes.includes(prefType.toLowerCase()))

    if (matchingTasks.length > 0) {
      // More points for more matching task types
      score += Math.min(matchingTasks.length * 10, 20)
    }
  }

  return score
}

/**
 * Sort listings by relevance score (highest first)
 */
export function rankListings(listings: ListingWithDetails[], preferences: UserPreferences): ListingWithDetails[] {
  return listings
    .map((listing) => ({
      listing,
      score: calculateRelevanceScore(listing, preferences),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ listing }) => listing)
}
