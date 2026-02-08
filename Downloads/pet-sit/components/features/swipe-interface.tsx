"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { SwipeCard } from "./swipe-card"
import { Button } from "@/components/ui/button"
import { X, Heart, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { rankListings } from "@/lib/utils/listing-ranking"
import { useToast } from "@/hooks/use-toast"
import { launchConfetti } from "@/lib/confetti"
import { STAY_PROPERTY_TYPE } from "@/lib/utils/listing-type"
import { formatSupabaseError, isMissingColumnError } from "@/lib/utils/supabase-errors"

interface SwipeInterfaceProps {
  userId: string
  userType: "homeowner" | "sitter"
}

type ListingAddress = {
  city?: string | null
  state?: string | null
  postal_code?: string | null
}

type ListingPet = {
  id?: string
  name?: string | null
  species?: string | null
}

type ListingTask = {
  task_type?: string | null
  description?: string | null
}

type ListingUser = {
  id?: string | null
  full_name?: string | null
  verification_tier?: string | null
  profile_photo_url?: string | null
}

type SwipeListing = {
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
  address?: ListingAddress
  pets?: ListingPet[] | null
  tasks?: ListingTask[] | null
  user?: ListingUser | null
}

type MatchRow = {
  id: string
}

function toSwipeCardInput(listing: SwipeListing): Parameters<typeof SwipeCard>[0]["listing"] {
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
      city: listing.address?.city ?? "",
      state: listing.address?.state ?? "",
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
      .map((task) => ({
        task_type: task.task_type ?? "",
        description: task.description ?? "",
      }))
      .filter((task) => task.task_type.length > 0),
    user: listing.user
      ? {
          full_name: listing.user.full_name ?? undefined,
          verification_tier: listing.user.verification_tier ?? undefined,
        }
      : undefined,
  }
}

export function SwipeInterface({ userId, userType }: SwipeInterfaceProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [listings, setListings] = useState<SwipeListing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSwipe, setLastSwipe] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadListings = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      console.log("[sitswap] Loading listings for user:", userId)

      // Get user's primary address for location-based ranking
      const { data: userAddress } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle()

      // Get listings that this user has already swiped on
      const { data: swipedMatches } = await supabase.from("matches").select("listing_id").eq("sitter_id", userId)

      const swipedIds = swipedMatches?.map((m) => m.listing_id) || []
      console.log("[sitswap] Already swiped on:", swipedIds.length, "listings")

      const createBaseQuery = () =>
        supabase
          .from("listings")
          .select(
            `
            *,
            address:addresses(city, state, postal_code),
            pets(*),
            tasks(*),
            user:profiles(id, full_name, verification_tier, profile_photo_url)
          `,
          )
          .eq("is_active", true)
          .neq("user_id", userId)

      const applyTypeFilter = <TQuery extends ReturnType<typeof createBaseQuery>>(query: TQuery, supportsListingType: boolean) => {
        // Show the opposite listing type for swiping.
        if (supportsListingType) {
          if (userType === "sitter") {
            return query.eq("listing_type", "pet_sitting").neq("property_type", STAY_PROPERTY_TYPE)
          }
          return query.or(`listing_type.eq.stay,property_type.eq.${STAY_PROPERTY_TYPE}`)
        }

        // Legacy fallback for older schemas without `listings.listing_type`.
        if (userType === "sitter") {
          return query.or(`property_type.neq.${STAY_PROPERTY_TYPE},property_type.is.null`)
        }
        return query.eq("property_type", STAY_PROPERTY_TYPE)
      }

      const applySwipedFilter = <TQuery extends ReturnType<typeof createBaseQuery>>(query: TQuery) => {
        if (swipedIds.length > 0) {
          return query.not("id", "in", `(${swipedIds.join(",")})`)
        }
        return query
      }

      let query = applySwipedFilter(applyTypeFilter(createBaseQuery(), true))
      let { data, error } = await query.limit(50)

      if (error && isMissingColumnError(error, "listing_type")) {
        console.warn(
          "[sitswap] Database schema missing listings.listing_type. Falling back to legacy type filters; run scripts/016_add_listing_type_columns.sql.",
        )
        query = applySwipedFilter(applyTypeFilter(createBaseQuery(), false))
        ;({ data, error } = await query.limit(50))
      }

      if (error) throw error

      console.log("[sitswap] Fetched", data?.length || 0, "listings to show")

      const rankedListings = rankListings((data ?? []) as SwipeListing[], {
        city: userAddress?.city,
        state: userAddress?.state,
        postal_code: userAddress?.postal_code,
      }) as SwipeListing[]

      setListings(rankedListings)
    } catch (error) {
      const message = formatSupabaseError(error)
      console.error("[sitswap] Error loading listings:", message)
      setLoadError(message)
      toast({
        title: "Couldn't load swipe listings",
        description:
          message.includes("listing_type") && message.includes("does not exist")
            ? "Your Supabase schema is missing `listings.listing_type`. Run `scripts/016_add_listing_type_columns.sql` in the Supabase SQL Editor."
            : message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast, userId, userType])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const handleSwipe = async (direction: "left" | "right") => {
    const listing = listings[currentIndex]
    if (!listing) return

    const swipeAction = direction === "right" ? "like" : "pass"
    const listingOwnerId = listing.user_id

    console.log("[sitswap] User", userId, "swiping", swipeAction, "on listing", listing.id, "owned by", listingOwnerId)

    try {
      const { data: myListings } = await supabase.from("listings").select("id").eq("user_id", userId)

      const myListingIds = myListings?.map((l) => l.id) || []
      console.log("[sitswap] Current user has", myListingIds.length, "listings")

      // Check if the listing owner (acting as sitter) has liked any of my listings
      let ownerLikedMyListing = false
      let ownerMatchRecord: MatchRow | null = null

      if (myListingIds.length > 0 && swipeAction === "like") {
        // Check if listing owner (as a sitter) liked any of MY listings
        const { data: ownerMatches } = await supabase
          .from("matches")
          .select("*")
          .eq("sitter_id", listingOwnerId)
          .in("listing_id", myListingIds)
          .eq("sitter_swipe", "like")

        if (ownerMatches && ownerMatches.length > 0) {
          ownerLikedMyListing = true
          ownerMatchRecord = ownerMatches[0] as MatchRow
        }
      }

      // 1. Current user swipes RIGHT on listing owner's listing
      // 2. Listing owner has ALREADY swiped RIGHT on current user's listing
      const isMatch = ownerLikedMyListing && swipeAction === "like"

      // Create the match record for current user's swipe
      const { data: newMatch, error: insertError } = await supabase
        .from("matches")
        .insert({
          listing_id: listing.id,
          sitter_id: userId,
          sitter_swipe: swipeAction,
          homeowner_swipe: ownerLikedMyListing ? "like" : null,
          is_match: isMatch,
          matched_at: isMatch ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[sitswap] Error creating match:", insertError)
        throw insertError
      }

      // If it's a match, update the owner's match record and create conversation
      if (isMatch && ownerMatchRecord) {
        // Update owner's existing match record
        await supabase
          .from("matches")
          .update({
            homeowner_swipe: "like",
            is_match: true,
            matched_at: new Date().toISOString(),
          })
          .eq("id", ownerMatchRecord.id)

        const { error: convError } = await supabase.from("conversations").insert({
          match_id: newMatch.id,
          participant1_id: userId,
          participant2_id: listingOwnerId,
          listing_id: listing.id,
        })

        if (convError) {
          console.error("[sitswap] Error creating conversation:", convError)
        }

        // Notify both users
        await supabase.from("notifications").insert([
          {
            user_id: listingOwnerId,
            type: "match",
            title: "It's a Match!",
            body: `You matched! You both liked each other's listings.`,
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
          {
            user_id: userId,
            type: "match",
            title: "It's a Match!",
            body: `You matched with ${listing.user?.full_name || "someone"}!`,
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
        ])

        toast({
          title: "It's a Match! 🎉",
          description: `You and ${listing.user?.full_name || "the listing owner"} liked each other's listings!`,
        })
        void launchConfetti("match")

        setTimeout(() => {
          router.push("/matches")
        }, 2000)
      }

      setLastSwipe(listing.id)
      setCurrentIndex((prev) => prev + 1)
    } catch (error) {
      console.error("[sitswap] Error recording swipe:", error)
      toast({
        title: "Error",
        description: "Failed to record swipe. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUndo = async () => {
    if (lastSwipe && currentIndex > 0) {
      try {
        await supabase.from("matches").delete().eq("listing_id", lastSwipe).eq("sitter_id", userId)

        setCurrentIndex((prev) => prev - 1)
        setLastSwipe(null)
      } catch (error) {
        console.error("[sitswap] Error undoing swipe:", error)
      }
    }
  }

  const handleInfoClick = () => {
    const listing = listings[currentIndex]
    if (listing) {
      router.push(`/listings/${listing.id}`)
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" />
  }

  if (loadError) {
    return (
      <EmptyState
        icon={Home}
        title="Swipe unavailable"
        description={
          loadError.includes("listing_type") && loadError.includes("does not exist")
            ? "Your Supabase database is missing `listings.listing_type`. Run `scripts/016_add_listing_type_columns.sql` in Supabase SQL Editor, then retry."
            : loadError
        }
        actionLabel="Retry"
        onAction={loadListings}
      />
    )
  }

  const currentListing = listings[currentIndex]

  if (!currentListing) {
    return (
      <EmptyState
        icon={Home}
        title="No more listings"
        description="You've seen all available listings. Check back later for new opportunities!"
        actionLabel="View Matches"
        actionHref="/matches"
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Card Stack */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <SwipeCard listing={toSwipeCardInput(currentListing)} onSwipe={handleSwipe} onInfoClick={handleInfoClick} />
        </div>

        {/* Next card preview */}
        {listings[currentIndex + 1] && (
          <div className="absolute inset-0 -z-10 scale-95 opacity-50">
            <SwipeCard
              listing={toSwipeCardInput(listings[currentIndex + 1])}
              onSwipe={() => {}}
              onInfoClick={() => {}}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 p-6">
        <Button
          size="icon"
          variant="outline"
          className="h-14 w-14 rounded-full border-2 border-destructive bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all hover:scale-110"
          onClick={() => handleSwipe("left")}
        >
          <X className="h-6 w-6" />
        </Button>

        {lastSwipe && currentIndex > 0 && (
          <Button size="icon" variant="outline" className="h-12 w-12 rounded-full bg-background" onClick={handleUndo}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}

        <Button
          size="icon"
          variant="outline"
          className="h-14 w-14 rounded-full border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110"
          onClick={() => handleSwipe("right")}
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>

      {/* Counter */}
      <div className="pb-4 text-center text-sm text-muted-foreground">
        {currentIndex + 1} of {listings.length}
      </div>
    </div>
  )
}
