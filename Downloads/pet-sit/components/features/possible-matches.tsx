"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ListingCard } from "@/components/features/listing-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronRight, MapPin, RefreshCw, Navigation } from "lucide-react"
import Link from "next/link"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { Badge } from "@/components/ui/badge"
import { calculateDistance, formatDistance } from "@/lib/utils/geocoding"
import { getListingType, isStayListing as isStayListingType, STAY_PROPERTY_TYPE } from "@/lib/utils/listing-type"
import { getVerificationBonusPoints } from "@/lib/utils/verification-tier"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"

interface PossibleMatchesProps {
  userId: string
  className?: string
}

type ListingAddress = {
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
} | null

type ListingPet = {
  id?: string
  name?: string | null
  species?: string | null
}

type ListingTask = {
  task_type?: string | null
}

type ListingUser = {
  full_name?: string | null
  profile_photo_url?: string | null
  verification_tier?: string | null
}

type UserListingRow = {
  id: string
  listing_type?: string | null
  property_type?: string | null
  search_radius?: number | null
  address?: ListingAddress
}

type ListingCandidate = {
  id: string
  user_id: string
  title: string
  description?: string | null
  photos?: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
  address_id?: string | null
  listing_type?: string | null
  property_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  square_feet?: number | null
  amenities?: string[] | null
  house_rules?: string | null
  search_radius?: number | null
  secondary_city?: string | null
  secondary_state?: string | null
  address?: ListingAddress
  pets?: ListingPet[] | null
  tasks?: ListingTask[] | null
  user?: ListingUser | null
}

type RankedMatch = ListingCandidate & {
  matchScore: number
  isStayListing: boolean
  distanceInfo: { distance: number; fromCity: string } | null
}

function toListingCardInput(listing: RankedMatch): Parameters<typeof ListingCard>[0]["listing"] {
  const addressCity = listing.address?.city ?? ""
  const addressState = listing.address?.state ?? ""

  return {
    id: listing.id,
    user_id: listing.user_id,
    address_id: listing.address_id ?? undefined,
    listing_type: listing.listing_type ?? undefined,
    title: listing.title,
    description: listing.description ?? "",
    property_type: listing.property_type ?? undefined,
    bedrooms: listing.bedrooms ?? undefined,
    bathrooms: listing.bathrooms ?? undefined,
    square_feet: listing.square_feet ?? undefined,
    amenities: listing.amenities ?? undefined,
    house_rules: listing.house_rules ?? undefined,
    photos: listing.photos ?? undefined,
    is_active: listing.is_active,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
    address: {
      city: addressCity,
      state: addressState,
    },
    pets: (listing.pets ?? []).map((pet, index) => ({
      id: pet.id ?? `${listing.id}-pet-${index}`,
      listing_id: listing.id,
      name: pet.name ?? "Pet",
      species: pet.species ?? undefined,
      is_active: true,
      created_at: listing.created_at,
    })),
    tasks: (listing.tasks ?? [])
      .map((task) => task.task_type?.trim())
      .filter((taskType): taskType is string => Boolean(taskType))
      .map((taskType) => ({ task_type: taskType })),
    user: listing.user
      ? {
          full_name: listing.user.full_name ?? undefined,
          verification_tier: listing.user.verification_tier ?? undefined,
        }
      : undefined,
  }
}

export function PossibleMatches({ userId, className }: PossibleMatchesProps) {
  const [matches, setMatches] = useState<RankedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userListings, setUserListings] = useState<UserListingRow[]>([])

  const fetchPossibleMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const supabase = createClient()

    try {
      const today = new Date().toISOString().slice(0, 10)
      const { data: bookedRows, error: bookedError } = await supabase
        .from("availability")
        .select("listing_id")
        .eq("is_booked", true)
        .gte("end_date", today)

      if (bookedError) {
        console.warn("[sitswap] Failed to load booked listings:", bookedError)
      }

      const bookedListingIds = new Set((bookedRows ?? []).map((row) => row.listing_id))

      // Get user's listings to understand what they're looking for
      const { data: myListings } = await supabase
        .from("listings")
        .select(`
          *,
          address:addresses(city, state, latitude, longitude)
        `)
        .eq("user_id", userId)

      const myListingRows = (myListings ?? []) as UserListingRow[]
      setUserListings(myListingRows)

      if (myListingRows.length === 0) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Get user's locations from their listings with coordinates
      const userLocations = myListingRows
        .filter((l) => l.address?.city)
        .map((l) => ({
          city: (l.address?.city ?? "").toLowerCase(),
          state: l.address?.state?.toLowerCase(),
          lat: l.address?.latitude,
          lng: l.address?.longitude,
          searchRadius: l.search_radius || 25,
        }))

      // Determine if user is looking for sitters or stays
      const listingTypes = myListingRows.map((l) => getListingType(l)).filter(Boolean)
      const userHasPetSittingListings = listingTypes.includes("pet_sitting")
      const userHasStayListings = listingTypes.includes("stay")

      // Get already swiped listings
      const { data: existingSwipes } = await supabase.from("matches").select("listing_id").eq("sitter_id", userId)

      const swipedIds = existingSwipes?.map((s) => s.listing_id) || []

      const createBaseQuery = () =>
        supabase
        .from("listings")
        .select(`
          *,
          address:addresses(city, state, latitude, longitude),
          pets(*),
          user:profiles(full_name, profile_photo_url, verification_tier)
        `)
        .neq("user_id", userId)
        .eq("is_active", true)
        .not("id", "in", `(${swipedIds.length > 0 ? swipedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)

      const applyTypeFilter = <TQuery extends ReturnType<typeof createBaseQuery>>(query: TQuery, supportsListingType: boolean) => {
        // Prefer to only fetch the opposite listing types.
        if (userHasPetSittingListings && !userHasStayListings) {
          return supportsListingType
            ? query.or(`listing_type.eq.stay,property_type.eq.${STAY_PROPERTY_TYPE}`)
            : query.eq("property_type", STAY_PROPERTY_TYPE)
        }
        if (userHasStayListings && !userHasPetSittingListings) {
          return supportsListingType
            ? query.eq("listing_type", "pet_sitting").neq("property_type", STAY_PROPERTY_TYPE)
            : query.or(`property_type.neq.${STAY_PROPERTY_TYPE},property_type.is.null`)
        }
        return query
      }

      let query = applyTypeFilter(createBaseQuery(), true)
      let { data: potentialMatches, error: matchError } = await query.limit(50)

      if (matchError && isMissingColumnError(matchError, "listing_type")) {
        console.warn(
          "[sitswap] Database schema missing listings.listing_type. Falling back to legacy type filters; run scripts/016_add_listing_type_columns.sql.",
        )
        query = applyTypeFilter(createBaseQuery(), false)
        ;({ data: potentialMatches, error: matchError } = await query.limit(50))
      }

      if (matchError) throw matchError

      const availableMatches = ((potentialMatches ?? []) as ListingCandidate[]).filter(
        (listing) => !bookedListingIds.has(listing.id),
      )

      const scoredMatches = availableMatches.map((listing): RankedMatch => {
        let score = 0
        let distanceInfo: { distance: number; fromCity: string } | null = null
        const listingCity = listing.address?.city?.toLowerCase() || ""
        const listingState = listing.address?.state?.toLowerCase() || ""
        const listingLat = listing.address?.latitude
        const listingLng = listing.address?.longitude

        // Determine listing type
        const isStayListing = isStayListingType(listing)

        // Match type preference
        if (userHasPetSittingListings && isStayListing) score += 15
        if (userHasStayListings && !isStayListing) score += 15

        for (const userLoc of userLocations) {
          // Exact city match - highest priority
          if (userLoc.city === listingCity) {
            score += 20
            distanceInfo = { distance: 0, fromCity: userLoc.city }
            break
          }

          // If we have coordinates, calculate actual distance
          if (userLoc.lat && userLoc.lng && listingLat && listingLng) {
            const distance = calculateDistance(userLoc.lat, userLoc.lng, listingLat, listingLng)

            // Check if within search radius
            if (distance <= userLoc.searchRadius) {
              // Score based on how close - closer = better
              const proximityScore = Math.max(0, 15 - (distance / userLoc.searchRadius) * 10)
              if (proximityScore > 0) {
                score += proximityScore
                if (!distanceInfo || distance < distanceInfo.distance) {
                  distanceInfo = { distance, fromCity: userLoc.city }
                }
              }
            }
          }

          // State match as fallback
          if (userLoc.state === listingState && !distanceInfo) {
            score += 5
          }
        }

        // Check secondary location if exists
        const secondaryCity = listing.secondary_city?.toLowerCase()
        const secondaryState = listing.secondary_state?.toLowerCase()

        for (const userLoc of userLocations) {
          if (secondaryCity && userLoc.city === secondaryCity) {
            score += 15
          }
          if (secondaryState && userLoc.state === secondaryState) {
            score += 4
          }
        }

        // Verification bonus
        const { points: verificationPoints } = getVerificationBonusPoints(listing.user?.verification_tier, {
          enhanced: 2,
          premium: 3,
        })
        score += verificationPoints

        // Has photos bonus
        const photoCount = listing.photos?.length ?? 0
        if (photoCount > 0) score += 2

        return { ...listing, matchScore: score, isStayListing, distanceInfo }
      })

      // Sort by score and take top matches
      const topMatches = scoredMatches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6)

      setMatches(topMatches)
    } catch (error) {
      console.error("[sitswap] Error fetching possible matches:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    fetchPossibleMatches()
  }, [fetchPossibleMatches])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Potential Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (userListings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Potential Matches
          </CardTitle>
          <CardDescription>Create a listing to see personalized matches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="rounded-full bg-primary/10 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              Once you create a listing, we'll show you listings that match your location and preferences.
            </p>
            <Link href="/listings/new">
              <Button>Create Your First Listing</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Potential Matches
          </CardTitle>
          <CardDescription>Based on your listing locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No matches found in your area yet. Try increasing your search radius or check back soon.
            </p>
            <Link href="/search">
              <Button variant="outline">Browse All Listings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Potential Matches
            <Badge variant="secondary" className="ml-2">
              {matches.length} found
            </Badge>
          </CardTitle>
          <CardDescription>Listings within your search radius and preferences</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchPossibleMatches(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/swipe">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((listing, index) => (
            <div key={listing.id} className="relative">
              {listing.distanceInfo && listing.distanceInfo.distance > 0 && (
                <div className="absolute -top-2 -left-2 z-10 bg-[#6c8fb6] text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {formatDistance(listing.distanceInfo.distance)}
                </div>
              )}
              {listing.matchScore >= 20 && (
                <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                  Great Match!
                </div>
              )}
              {listing.matchScore >= 12 && listing.matchScore < 20 && (
                <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                  Good Match
                </div>
              )}
              <ListingCard listing={toListingCardInput(listing)} showLikeButton currentUserId={userId} index={index} />
            </div>
          ))}
        </div>

        {/* Tips section */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Improve your matches</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Increase your search radius to find more opportunities</li>
            <li>• Add a secondary location to double your chances</li>
            <li>• Complete your profile verification for priority matching</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
