"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ListingCard } from "@/components/features/listing-card"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Navigation,
  Users,
  Trophy,
  Medal,
  Award,
  Wrench,
  RefreshCw,
} from "lucide-react"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { Badge } from "@/components/ui/badge"
import { calculateDistance, formatDistance } from "@/lib/utils/geocoding"
import { cn } from "@/lib/utils"
import { getListingType, getOppositeListingType, STAY_PROPERTY_TYPE } from "@/lib/utils/listing-type"
import { getVerificationBonusPoints } from "@/lib/utils/verification-tier"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"

type ListingAddress = {
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
} | null

type ListingTask = {
  task_type?: string | null
}

type ListingPetSummary = {
  id?: string
  name?: string | null
  species?: string | null
}

type ListingAvailability = {
  start_date?: string | null
  end_date?: string | null
  is_booked?: boolean | null
}

type ListingCardInput = Parameters<typeof ListingCard>[0]["listing"]

type ListingMatchInput = Omit<
  ListingCardInput,
  "address_id" | "listing_type" | "property_type" | "description" | "photos" | "address" | "pets" | "tasks" | "user"
> & {
  address_id?: string | null
  listing_type?: string | null
  property_type?: string | null
  description?: string | null
  photos?: string[] | null
  address?: ListingAddress
  addresses?: ListingAddress
  pets?: ListingPetSummary[] | null
  tasks?: ListingTask[] | null
  services_offered?: string[] | null
  search_radius?: number | null
  availability?: ListingAvailability[] | null
  user?: {
    full_name?: string | null
    profile_photo_url?: string | null
    verification_tier?: string | null
  } | null
}

type DateRange = {
  start: Date
  end: Date
}

type ScoredMatch = ListingMatchInput & {
  matchScore: number
  isStayListing: boolean
  isSitterListing: boolean
  distanceInfo: { distance: number; fromCity: string } | null
  dateOverlapInfo: { days: number; ranges: string[] } | null
  matchReasons: string[]
}

interface ListingMatchesProps {
  listing: ListingMatchInput
  userId: string
  className?: string
  maxMatches?: number
}

function getDateOverlapDays(start1: Date | null, end1: Date | null, start2: Date | null, end2: Date | null): number {
  if (!start1 || !end1 || !start2 || !end2) return 0

  const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()))
  const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()))

  if (overlapStart > overlapEnd) return 0

  const diffTime = overlapEnd.getTime() - overlapStart.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

function toDateRanges(availability: ListingAvailability[] | null | undefined): DateRange[] {
  return (availability ?? [])
    .filter((row) => !row.is_booked && Boolean(row.start_date) && Boolean(row.end_date))
    .map((row) => ({
      start: new Date(row.start_date as string),
      end: new Date(row.end_date as string),
    }))
}

function toListingCardInput(match: ListingMatchInput): ListingCardInput {
  const city = match.address?.city ?? match.addresses?.city ?? ""
  const state = match.address?.state ?? match.addresses?.state ?? ""
  const tasks = (match.tasks ?? [])
    .map((task) => task.task_type?.trim())
    .filter((task): task is string => Boolean(task))
    .map((taskType) => ({ task_type: taskType }))

  return {
    id: match.id,
    user_id: match.user_id,
    address_id: match.address_id ?? undefined,
    listing_type: match.listing_type ?? undefined,
    title: match.title,
    description: match.description ?? "",
    property_type: match.property_type ?? undefined,
    bedrooms: match.bedrooms,
    bathrooms: match.bathrooms,
    square_feet: match.square_feet,
    amenities: match.amenities,
    house_rules: match.house_rules,
    photos: match.photos ?? undefined,
    is_active: match.is_active,
    created_at: match.created_at,
    updated_at: match.updated_at,
    address: {
      city,
      state,
    },
    pets: (match.pets ?? []).map((pet, index) => ({
      id: pet.id ?? `${match.id}-pet-${index}`,
      listing_id: match.id,
      name: pet.name ?? "Pet",
      species: pet.species ?? undefined,
      is_active: true,
      created_at: match.created_at,
    })),
    tasks,
    user: match.user
      ? {
          full_name: match.user.full_name ?? undefined,
          verification_tier: match.user.verification_tier ?? undefined,
        }
      : undefined,
  }
}

export function ListingMatches({ listing, userId, className, maxMatches = 10 }: ListingMatchesProps) {
  const [matches, setMatches] = useState<ScoredMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMatches = useCallback(async () => {
    const supabase = createClient()

    try {
      const currentListingType = getListingType(listing)
      const oppositeListingType = getOppositeListingType(currentListingType)

      const currentIsStayListing = currentListingType === "stay"
      const currentIsSitterListing = currentListingType === "pet_sitting"

      if (!currentListingType || !oppositeListingType || (!currentIsStayListing && !currentIsSitterListing)) {
        console.log("[sitswap] Listing is neither a valid stay nor sitter listing, skipping matches:", {
          listingId: listing.id,
          title: listing.title,
          propertyType: listing.property_type,
          listingType: listing.listing_type,
        })
        return []
      }

      console.log("[sitswap] Fetching matches for listing:", {
        listingId: listing.id,
        title: listing.title,
        propertyType: listing.property_type,
        currentIsStayListing,
        currentIsSitterListing,
      })

      // Get already swiped listings to exclude
      const { data: swipedAsSitter } = await supabase.from("matches").select("listing_id").eq("sitter_id", userId)

      const swipedListingIds = swipedAsSitter?.map((s) => s.listing_id) || []

      const { data: currentAvailability } = await supabase
        .from("availability")
        .select("start_date, end_date, is_booked")
        .eq("listing_id", listing.id)
        .eq("is_booked", false)

      const createBaseQuery = () =>
        supabase
          .from("listings")
          .select(`
            *,
            address:addresses(city, state, latitude, longitude),
            pets(*),
            tasks(*),
            user:profiles(id, full_name, profile_photo_url, verification_tier),
            availability(start_date, end_date, is_booked)
          `)
          .neq("user_id", userId)
          .eq("is_active", true)

      const buildQuery = (supportsListingType: boolean) => {
        let query = createBaseQuery()

        if (oppositeListingType === "stay") {
          query = supportsListingType
            ? query.or(`listing_type.eq.stay,property_type.eq.${STAY_PROPERTY_TYPE}`)
            : query.eq("property_type", STAY_PROPERTY_TYPE)
        } else {
          query = supportsListingType
            ? query.eq("listing_type", "pet_sitting").neq("property_type", STAY_PROPERTY_TYPE)
            : query.or(`property_type.neq.${STAY_PROPERTY_TYPE},property_type.is.null`)
        }

        if (swipedListingIds.length > 0) {
          query = query.not("id", "in", `(${swipedListingIds.join(",")})`)
        }

        return query.limit(50)
      }

      let query = buildQuery(true)
      let { data: potentialMatches, error } = await query

      if (error && isMissingColumnError(error, "listing_type")) {
        console.warn(
          "[sitswap] Database schema missing listings.listing_type. Falling back to legacy type filters; run scripts/016_add_listing_type_columns.sql.",
        )
        query = buildQuery(false)
        ;({ data: potentialMatches, error } = await query)
      }

      if (error) {
        console.error("[sitswap] Error fetching potential matches:", error)
        return []
      }

      console.log("[sitswap] Found potential matches:", potentialMatches?.length || 0)

      if (!potentialMatches || potentialMatches.length === 0) {
        console.log("[sitswap] No potential matches found after query")
        return []
      }

      const currentTasksNeeded = (listing.tasks ?? [])
        .map((task) => task.task_type?.toLowerCase())
        .filter((task): task is string => Boolean(task))
      const currentServicesOffered = listing.services_offered ?? []

      const currentAddress = {
        city: listing.addresses?.city?.toLowerCase() || listing.address?.city?.toLowerCase() || "",
        state: listing.addresses?.state?.toLowerCase() || listing.address?.state?.toLowerCase() || "",
        lat: listing.addresses?.latitude || listing.address?.latitude,
        lng: listing.addresses?.longitude || listing.address?.longitude,
      }
      const currentSearchRadius = listing.search_radius || 50

      const currentDateRanges = toDateRanges(currentAvailability ?? [])

      console.log("[sitswap] Current listing details:", {
        tasksNeeded: currentTasksNeeded,
        servicesOffered: currentServicesOffered,
        address: currentAddress,
        searchRadius: currentSearchRadius,
        availableDateRanges: currentDateRanges.length,
      })

      const scoredMatches = ((potentialMatches as ListingMatchInput[] | null) ?? []).map((match) => {
        let score = 0
        const matchReasons: string[] = []
        let distanceInfo: { distance: number; fromCity: string } | null = null
        let dateOverlapInfo: { days: number; ranges: string[] } | null = null

        const matchCity = match.address?.city?.toLowerCase() || ""
        const matchState = match.address?.state?.toLowerCase() || ""
        const matchLat = match.address?.latitude
        const matchLng = match.address?.longitude
        const matchSearchRadius = match.search_radius || 50

        const matchListingType = getListingType(match)
        const matchIsStayListing = matchListingType === "stay"
        const matchIsSitterListing = matchListingType === "pet_sitting"

        const matchTasksNeeded = (match.tasks ?? [])
          .map((task) => task.task_type?.toLowerCase())
          .filter((task): task is string => Boolean(task))
        const matchServicesOffered = match.services_offered ?? []

        // Base score for being an opposite type
        if (currentIsSitterListing && matchIsStayListing) {
          score += 30
          matchReasons.push("Looking for a stay")
        } else if (currentIsStayListing && matchIsSitterListing) {
          score += 30
          matchReasons.push("Has a home for you")
        } else {
          console.log("[sitswap] Skipping match - not opposite type:", {
            matchId: match.id,
            matchPropertyType: match.property_type,
            matchIsStayListing,
            matchIsSitterListing,
            currentIsStayListing,
            currentIsSitterListing,
          })
          return null
        }

        const matchDateRanges = toDateRanges(match.availability)

        if (currentDateRanges.length > 0 && matchDateRanges.length > 0) {
          let totalOverlapDays = 0
          const overlappingRanges: string[] = []

          for (const currentRange of currentDateRanges) {
            for (const matchRange of matchDateRanges) {
              const overlapDays = getDateOverlapDays(
                currentRange.start,
                currentRange.end,
                matchRange.start,
                matchRange.end,
              )
              if (overlapDays > 0) {
                totalOverlapDays += overlapDays
                const overlapStart = new Date(Math.max(currentRange.start!.getTime(), matchRange.start!.getTime()))
                const overlapEnd = new Date(Math.min(currentRange.end!.getTime(), matchRange.end!.getTime()))
                overlappingRanges.push(
                  `${overlapStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${overlapEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                )
              }
            }
          }

          if (totalOverlapDays > 0) {
            // Score based on overlap duration: up to 25 points
            const dateScore = Math.min(25, Math.round(totalOverlapDays * 1.5))
            score += dateScore
            dateOverlapInfo = { days: totalOverlapDays, ranges: overlappingRanges }

            if (totalOverlapDays >= 14) {
              matchReasons.push(`${totalOverlapDays} days overlap`)
            } else if (totalOverlapDays >= 7) {
              matchReasons.push(`${totalOverlapDays} days overlap`)
            } else {
              matchReasons.push(`${totalOverlapDays} day${totalOverlapDays > 1 ? "s" : ""} overlap`)
            }
          }
        } else if (currentDateRanges.length === 0 && matchDateRanges.length > 0) {
          // Current listing has no availability set, but match does - small bonus for having dates
          score += 3
        }

        // Service matching
        if (currentIsSitterListing && matchIsStayListing) {
          const serviceMatches = currentTasksNeeded.filter((task: string) => {
            const taskToService: Record<string, string[]> = {
              pet_sitting: ["pet_sitting", "dog_walking", "pet_care"],
              dog_walking: ["dog_walking", "pet_sitting"],
              gardening: ["gardening", "lawn_care", "yard_work"],
              lawn_care: ["lawn_care", "gardening"],
              cleaning: ["cleaning", "house_sitting", "housekeeping"],
              house_cleaning: ["cleaning", "house_sitting"],
              cooking: ["cooking", "meal_prep"],
              handyman: ["handyman", "repairs"],
              childcare: ["childcare", "babysitting"],
              eldercare: ["eldercare", "senior_care"],
              pool_maintenance: ["pool_maintenance"],
              errands: ["errands", "shopping"],
              general: ["house_sitting", "cleaning", "errands"],
            }
            const relatedServices = taskToService[task] || [task]
            return relatedServices.some((service) =>
              matchServicesOffered.some(
                (offered: string) =>
                  offered?.toLowerCase().includes(service) || service.includes(offered?.toLowerCase() || ""),
              ),
            )
          })

          if (serviceMatches.length > 0) {
            score += Math.min(40, 12 * serviceMatches.length)
            matchReasons.push(`Offers ${serviceMatches.length} service${serviceMatches.length > 1 ? "s" : ""} you need`)
          }
        } else if (currentIsStayListing && matchIsSitterListing) {
          const serviceMatches = currentServicesOffered.filter((service: string) => {
            const serviceToTask: Record<string, string[]> = {
              pet_sitting: ["pet_sitting", "pet_care", "animal_care"],
              dog_walking: ["dog_walking", "pet_sitting", "pet_care"],
              gardening: ["gardening", "yard_work", "lawn_care"],
              lawn_care: ["lawn_care", "gardening", "yard_work"],
              cleaning: ["cleaning", "house_cleaning", "housekeeping"],
              house_sitting: ["house_sitting", "home_care", "general"],
              cooking: ["cooking", "meal_prep"],
              handyman: ["handyman", "repairs", "maintenance"],
              childcare: ["childcare", "babysitting"],
              eldercare: ["eldercare", "senior_care"],
              pool_maintenance: ["pool_maintenance", "pool_care"],
              errands: ["errands", "shopping", "general"],
            }
            const relatedTasks = serviceToTask[service] || [service]
            return relatedTasks.some((task) =>
              matchTasksNeeded.some(
                (needed: string) => needed?.toLowerCase().includes(task) || task.includes(needed?.toLowerCase() || ""),
              ),
            )
          })

          if (serviceMatches.length > 0) {
            score += Math.min(40, 12 * serviceMatches.length)
            matchReasons.push(`Needs ${serviceMatches.length} service${serviceMatches.length > 1 ? "s" : ""} you offer`)
          }
        }

        // Location scoring
        if (currentIsStayListing && matchIsSitterListing) {
          if (currentAddress.city && matchCity && currentAddress.city === matchCity) {
            score += 25
            distanceInfo = { distance: 0, fromCity: matchCity }
            matchReasons.push("Same city")
          } else if (currentAddress.lat && currentAddress.lng && matchLat && matchLng) {
            const distance = calculateDistance(currentAddress.lat, currentAddress.lng, matchLat, matchLng)
            if (distance <= currentSearchRadius) {
              score += Math.max(5, 20 - (distance / currentSearchRadius) * 15)
              distanceInfo = { distance, fromCity: matchCity }
              matchReasons.push(`${Math.round(distance)} miles away`)
            } else if (distance <= currentSearchRadius * 1.5) {
              score += 5
              distanceInfo = { distance, fromCity: matchCity }
              matchReasons.push(`${Math.round(distance)} miles (outside radius)`)
            }
          } else if (currentAddress.state && matchState && currentAddress.state === matchState) {
            score += 15
            matchReasons.push("Same state")
          }
        } else if (currentIsSitterListing && matchIsStayListing) {
          if (currentAddress.city && matchCity && matchCity === currentAddress.city) {
            score += 25
            distanceInfo = { distance: 0, fromCity: currentAddress.city }
            matchReasons.push("Wants your city")
          } else if (matchLat && matchLng && currentAddress.lat && currentAddress.lng) {
            const distance = calculateDistance(matchLat, matchLng, currentAddress.lat, currentAddress.lng)
            if (distance <= matchSearchRadius) {
              score += Math.max(5, 20 - (distance / matchSearchRadius) * 15)
              distanceInfo = { distance, fromCity: currentAddress.city }
              matchReasons.push(`Within their ${matchSearchRadius}mi range`)
            } else if (distance <= matchSearchRadius * 1.5) {
              score += 5
              distanceInfo = { distance, fromCity: currentAddress.city }
              matchReasons.push("Near their search area")
            }
          } else if (currentAddress.state && matchState && matchState === currentAddress.state) {
            score += 15
            matchReasons.push("Same state")
          }
        }

        // Verification bonus
        const verification = getVerificationBonusPoints(match.user?.verification_tier, {
          enhanced: 5,
          premium: 8,
        })
        if (verification.points > 0) {
          score += verification.points
          if (verification.label) matchReasons.push(verification.label)
        }

        // Profile completeness
        const photoCount = match.photos?.length ?? 0
        const descriptionLength = match.description?.length ?? 0
        if (photoCount >= 3) score += 4
        else if (photoCount > 0) score += 2
        if (descriptionLength > 100) score += 2

        return {
          ...match,
          matchScore: score,
          isStayListing: matchIsStayListing,
          isSitterListing: matchIsSitterListing,
          distanceInfo,
          dateOverlapInfo, // Include date overlap info in match result
          matchReasons,
        }
      })

      const filteredMatches = scoredMatches
        .filter((match): match is ScoredMatch => match !== null && match.matchScore >= 5)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxMatches)

      console.log("[sitswap] Final filtered matches:", filteredMatches.length)

      return filteredMatches
    } catch (error) {
      console.error("[sitswap] Error fetching listing matches:", error)
      return []
    }
  }, [userId, maxMatches, listing])

  // Initial fetch
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true)
      const results = await fetchMatches()
      setMatches(results)
      setLoading(false)
    }
    loadMatches()
  }, [fetchMatches])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("listing-matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "listings",
        },
        async () => {
          console.log("[sitswap] New listing detected, refreshing matches...")
          const results = await fetchMatches()
          setMatches(results)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMatches])

  const handleRefresh = async () => {
    setRefreshing(true)
    const results = await fetchMatches()
    setMatches(results)
    setRefreshing(false)
  }

  const getRankBadge = (index: number, score: number) => {
    if (index === 0 && score >= 40) {
      return (
        <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          Best Match
        </div>
      )
    }
    if (index === 1 && score >= 35) {
      return (
        <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
          <Medal className="h-3 w-3" />
          Great Match
        </div>
      )
    }
    if (index === 2 && score >= 30) {
      return (
        <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
          <Award className="h-3 w-3" />
          Good Match
        </div>
      )
    }
    if (score >= 25) {
      return (
        <div className="absolute -top-2 -right-2 z-10 bg-primary/80 text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium shadow-lg">
          Match
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className={cn("mt-4 p-4 bg-muted/30 rounded-lg", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium">Finding matches...</span>
        </div>
        <div className="grid gap-3 grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    const currentType = getListingType(listing)
    const currentIsStayListing = currentType === "stay"
    const currentIsSitterListing = currentType === "pet_sitting"

    if (!currentIsStayListing && !currentIsSitterListing) {
      return (
        <div className={cn("mt-4 p-4 bg-muted/30 rounded-lg", className)}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              This listing needs a valid listing type to find matches. Please edit your listing.
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("mt-4 p-4 bg-muted/30 rounded-lg", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              No matches found for this listing yet. Try expanding your search radius or check back later!
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>
    )
  }

  const currentListingIsStay = getListingType(listing) === "stay"

  return (
    <div className={cn("mt-4", className)}>
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 rounded-lg border border-primary/20"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {matches.length} Potential Match{matches.length !== 1 ? "es" : ""}
          </span>
          <Badge variant="secondary" className="text-xs">
            {currentListingIsStay ? "Hosts with homes" : "Sitters looking for stays"}
          </Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <div className="mt-3 p-4 bg-muted/30 rounded-lg border animate-in slide-in-from-top-2 duration-200">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Trophy className="h-3 w-3 text-yellow-500" />
              Ranked by compatibility (location + services + dates)
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-7 px-2">
              <RefreshCw className={cn("h-3 w-3 mr-1", refreshing && "animate-spin")} />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match, index) => (
              <div key={match.id} className="relative">
                {match.distanceInfo && match.distanceInfo.distance > 0 && (
                  <div className="absolute -top-2 -left-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {formatDistance(match.distanceInfo.distance)}
                  </div>
                )}

                {getRankBadge(index, match.matchScore)}

                <ListingCard listing={toListingCardInput(match)} showLikeButton currentUserId={userId} index={index} />

                {match.matchReasons && match.matchReasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.matchReasons.slice(0, 4).map((reason: string, i: number) => (
                      <Badge
                        key={i}
                        variant={reason.includes("service") ? "default" : "outline"}
                        className={cn("text-xs", reason.includes("service") && "bg-green-500/90 hover:bg-green-500")}
                      >
                        {reason.includes("service") && <Wrench className="h-3 w-3 mr-1" />}
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}

                {match.dateOverlapInfo && match.dateOverlapInfo.days > 0 && (
                  <div className="absolute top-8 -left-2 z-10 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {match.dateOverlapInfo.days}d match
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
