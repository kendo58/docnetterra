"use server"

import { createServerClient } from "@/lib/supabase/server"
import { calculateDistance } from "@/lib/utils/geocoding"
import { getListingType, getOppositeListingType, STAY_PROPERTY_TYPE } from "@/lib/utils/listing-type"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"

interface MatchResult {
  userId: string
  listingId: string
  listingTitle: string
  matchScore: number
  reasons: string[]
}

type ListingAddress = {
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
}

type ListingTask = {
  task_type: string | null
}

type ListingProfile = {
  id: string
  full_name: string | null
  email: string | null
}

type ListingRow = {
  id: string
  user_id: string
  title: string
  listing_type: string | null
  property_type: string | null
  search_radius: number | null
  services_offered: string[] | null
  addresses: ListingAddress | ListingAddress[] | null
  tasks: ListingTask[] | null
  profiles: ListingProfile | ListingProfile[] | null
}

function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function findAndNotifyPotentialMatches(newListingId: string): Promise<{ notified: number }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn("[sitswap] Skipping match notifications for unauthenticated request:", { newListingId })
    return { notified: 0 }
  }

  // Get the new listing with its details
  const { data: newListing, error: listingError } = await supabase
    .from("listings")
    .select(`
      *,
      addresses!listings_address_id_fkey (
        city, state, latitude, longitude
      ),
      tasks (task_type),
      profiles!listings_user_id_fkey (full_name, email)
    `)
    .eq("id", newListingId)
    .single<ListingRow>()

  if (listingError || !newListing) {
    console.error("[sitswap] Error fetching new listing:", listingError)
    return { notified: 0 }
  }

  if (newListing.user_id !== user.id) {
    console.warn("[sitswap] Skipping match notifications for non-owner request:", {
      newListingId,
      requesterId: user.id,
      listingOwnerId: newListing.user_id,
    })
    return { notified: 0 }
  }

  const newListingType = getListingType(newListing)
  const oppositeListingType = getOppositeListingType(newListingType)

  if (!newListingType || !oppositeListingType) {
    console.warn("[sitswap] Skipping match notifications for unsupported listing type:", {
      newListingId,
      listingType: newListing.listing_type,
      propertyType: newListing.property_type,
    })
    return { notified: 0 }
  }

  // Get all other active listings that are the OPPOSITE type
  const createBaseMatchQuery = () =>
    supabase
      .from("listings")
      .select(`
        *,
        addresses!listings_address_id_fkey (
          city, state, latitude, longitude
        ),
        tasks (task_type),
        profiles!listings_user_id_fkey (id, full_name, email)
      `)
      .eq("is_active", true)
      .neq("id", newListingId)
      .neq("user_id", newListing.user_id)

  const newListingAddress = toOne(newListing.addresses)

  const buildMatchQuery = (supportsListingType: boolean) => {
    let query = createBaseMatchQuery()
    if (oppositeListingType === "stay") {
      query = supportsListingType
        ? query.or(`listing_type.eq.stay,property_type.eq.${STAY_PROPERTY_TYPE}`)
        : query.eq("property_type", STAY_PROPERTY_TYPE)
    } else {
      query = supportsListingType
        ? query.eq("listing_type", "pet_sitting").neq("property_type", STAY_PROPERTY_TYPE)
        : query.or(`property_type.neq.${STAY_PROPERTY_TYPE},property_type.is.null`)
    }

    if (newListingAddress?.state) {
      query = query.eq("addresses.state", newListingAddress.state)
    }

    return query
  }

  let matchQuery = buildMatchQuery(true)
  let { data: potentialMatches, error: matchError } = await matchQuery.limit(500)

  if (matchError && isMissingColumnError(matchError, "listing_type")) {
    console.warn(
      "[sitswap] Database schema missing listings.listing_type. Falling back to legacy type filters; run scripts/016_add_listing_type_columns.sql.",
    )
    matchQuery = buildMatchQuery(false)
    ;({ data: potentialMatches, error: matchError } = await matchQuery.limit(500))
  }

  if (matchError || !potentialMatches) {
    console.error("[sitswap] Error fetching potential matches:", matchError)
    return { notified: 0 }
  }

  const matches: MatchResult[] = []
  const newListingTasks = (newListing.tasks ?? [])
    .map((task) => task.task_type)
    .filter((task): task is string => typeof task === "string" && task.length > 0)
  const newListingServices = (newListing.services_offered ?? []).filter(
    (service): service is string => typeof service === "string" && service.length > 0,
  )

  for (const match of (potentialMatches as ListingRow[] | null) ?? []) {
    const matchType = getListingType(match)
    if (!matchType || matchType !== oppositeListingType) continue

    let score = 0
    const reasons: string[] = []

    // Base score for compatible type
    score += 30
    reasons.push("Compatible listing type")

    const matchAddress = toOne(match.addresses)

    // Location matching
    if (newListingAddress && matchAddress) {
      // Check if locations are the same city/state
      if (
        newListingAddress.city?.toLowerCase() === matchAddress.city?.toLowerCase() &&
        newListingAddress.state?.toLowerCase() === matchAddress.state?.toLowerCase()
      ) {
        score += 25
        reasons.push("Same location")
      } else if (
        newListingAddress.latitude &&
        newListingAddress.longitude &&
        matchAddress.latitude &&
        matchAddress.longitude
      ) {
        // Calculate distance
        const distance = calculateDistance(
          newListingAddress.latitude,
          newListingAddress.longitude,
          matchAddress.latitude,
          matchAddress.longitude,
        )

        // Get search radius (from the stay listing)
        const searchRadius =
          newListingType === "stay" ? newListing.search_radius || 25 : (match.search_radius as number | null) || 25

        if (distance <= searchRadius) {
          score += 20
          reasons.push(`Within ${Math.round(distance)} miles`)
        } else if (distance <= searchRadius * 1.5) {
          score += 10
          reasons.push(`${Math.round(distance)} miles away`)
        }
      }
    }

    // Service matching
    const matchTasks = (match.tasks ?? [])
      .map((task) => task.task_type)
      .filter((task): task is string => typeof task === "string" && task.length > 0)
    const matchServices = (match.services_offered ?? []).filter(
      (service): service is string => typeof service === "string" && service.length > 0,
    )

    // If new listing is pet_sitting (has tasks), check if match (stay) offers those services
    if (newListingType === "pet_sitting" && newListingTasks.length > 0 && matchServices.length > 0) {
      const matchingServices = newListingTasks.filter(
        (task: string) => matchServices.includes(task) || matchServices.some((s: string) => isRelatedService(task, s)),
      )
      if (matchingServices.length > 0) {
        score += matchingServices.length * 15
        reasons.push(`Offers ${matchingServices.length} service(s) you need`)
      }
    }

    // If new listing is stay (offers services), check if match (pet_sitting) needs them
    if (newListingType === "stay" && newListingServices.length > 0 && matchTasks.length > 0) {
      const matchingServices = matchTasks.filter(
        (task: string) =>
          newListingServices.includes(task) || newListingServices.some((s: string) => isRelatedService(task, s)),
      )
      if (matchingServices.length > 0) {
        score += matchingServices.length * 15
        reasons.push(`Needs ${matchingServices.length} service(s) you offer`)
      }
    }

    // Only include if score is high enough
    const matchProfile = toOne(match.profiles)
    if (score >= 30 && matchProfile?.id) {
      matches.push({
        userId: matchProfile.id,
        listingId: match.id,
        listingTitle: match.title,
        matchScore: score,
        reasons,
      })
    }
  }

  // Deduplicate per user (avoid spamming users with multiple listings).
  const bestByUser = new Map<string, MatchResult>()
  for (const match of matches) {
    const current = bestByUser.get(match.userId)
    if (!current || match.matchScore > current.matchScore) {
      bestByUser.set(match.userId, match)
    }
  }

  // Sort by score and notify top matches
  const topMatches = Array.from(bestByUser.values())
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10) // Notify top 10 users

  let notifiedCount = 0

  for (const match of topMatches) {
    try {
      // Create notification for the other user
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: match.userId,
        type: "potential_match",
        title: "New Potential Match!",
        body: `A new listing "${newListing.title}" might be a great match for your listing "${match.listingTitle}". ${match.reasons.slice(0, 2).join(", ")}.`,
        data: {
          url: `/listings/${newListingId}`,
          newListingId,
          matchListingId: match.listingId,
          matchScore: match.matchScore,
          reasons: match.reasons,
        },
      })

      if (!notifError) {
        notifiedCount++
      }
    } catch (err) {
      console.error("[sitswap] Error notifying user:", err)
    }
  }

  return { notified: notifiedCount }
}

// Helper function to check if two services are related
function isRelatedService(task: string, service: string): boolean {
  const relatedServices: Record<string, string[]> = {
    pet_sitting: ["dog_walking", "pet_care"],
    dog_walking: ["pet_sitting", "pet_care"],
    gardening: ["lawn_care", "yard_work"],
    lawn_care: ["gardening", "yard_work"],
    cleaning: ["housekeeping", "house_sitting"],
    house_sitting: ["cleaning", "housekeeping"],
    handyman: ["maintenance", "repairs"],
    pool_maintenance: ["yard_work", "maintenance"],
  }

  const related = relatedServices[task.toLowerCase()] || []
  return related.includes(service.toLowerCase())
}

export async function refreshMatchesForListing(listingId: string) {
  return findAndNotifyPotentialMatches(listingId)
}
