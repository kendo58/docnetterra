"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ListingCard } from "./listing-card"
import { cn } from "@/lib/utils"

interface SmartRecommendationsProps {
  userId: string
  className?: string
}

type ListingAddress = {
  city?: string | null
  state?: string | null
} | null

type ListingPet = {
  id?: string
  name?: string | null
  species?: string | null
}

type ListingUser = {
  full_name?: string | null
  verification_tier?: string | null
}

type RecommendationListing = {
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
  tasks?: Array<{ task_type?: string | null }> | null
  user?: ListingUser | null
}

type RankedRecommendation = RecommendationListing & {
  recommendationScore: number
}

function toListingCardInput(listing: RankedRecommendation): Parameters<typeof ListingCard>[0]["listing"] {
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

export function SmartRecommendations({ userId, className }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RankedRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)

    try {
      // Get user's profile for preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, address:addresses(*)")
        .eq("id", userId)
        .maybeSingle()

      // Get user's past interactions (likes)
      const { data: userMatches } = await supabase
        .from("matches")
        .select("listing_id, sitter_swipe")
        .eq("sitter_id", userId)

      const likedListingIds = userMatches?.filter((m) => m.sitter_swipe === "like").map((m) => m.listing_id) || []
      const interactedListingIds = userMatches?.map((m) => m.listing_id) || []

      // Get liked listings to understand preferences
      const preferredPetTypes: string[] = []
      const preferredStates: string[] = []

      if (likedListingIds.length > 0) {
        const { data: likedListings } = await supabase
          .from("listings")
          .select("*, pets(*), address:addresses!listings_address_id_fkey(*)")
          .in("id", likedListingIds)

        likedListings?.forEach((listing) => {
          if (listing.pets) {
            listing.pets.forEach((pet: { species?: string | null }) => {
              if (pet.species && !preferredPetTypes.includes(pet.species)) {
                preferredPetTypes.push(pet.species)
              }
            })
          }
          if (listing.address?.state && !preferredStates.includes(listing.address.state)) {
            preferredStates.push(listing.address.state)
          }
        })
      }

      // Get user's state if no preferences
      const userState = profile?.address?.[0]?.state
      if (userState && preferredStates.length === 0) {
        preferredStates.push(userState)
      }

      // Fetch recommendations
      let query = supabase
        .from("listings")
        .select(`
          *,
          pets(*),
          tasks(*),
          user:profiles!listings_user_id_fkey(*),
          address:addresses!listings_address_id_fkey(*)
        `)
        .eq("is_active", true)
        .neq("user_id", userId)
        .limit(20)

      // Exclude already interacted listings
      if (interactedListingIds.length > 0) {
        query = query.not("id", "in", `(${interactedListingIds.join(",")})`)
      }

      const { data: listings } = await query

      // Score and sort listings
      const scoredListings = ((listings ?? []) as RecommendationListing[]).map((listing): RankedRecommendation => {
        let score = 0

        // Location match
        if (listing.address?.state && preferredStates.includes(listing.address.state)) {
          score += 30
        }

        // Pet type match
        if (listing.pets && preferredPetTypes.length > 0) {
          const hasPreferredPet = listing.pets.some((pet) => Boolean(pet.species && preferredPetTypes.includes(pet.species)))
          if (hasPreferredPet) score += 25
        }

        // Verification bonus
        if (listing.user?.verification_tier === "premium") {
          score += 15
        } else if (listing.user?.verification_tier === "enhanced") {
          score += 10
        }

        // Recency bonus
        const daysSinceCreated = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceCreated < 7) score += 10
        else if (daysSinceCreated < 30) score += 5

        // Photo bonus
        if (listing.photos && listing.photos.length > 2) score += 5

        return { ...listing, recommendationScore: score }
      })

      // Sort by score and take top results
      scoredListings.sort((a, b) => b.recommendationScore - a.recommendationScore)
      setRecommendations(scoredListings.slice(0, 6))
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRecommendations()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recommended for You</h2>
          <Badge variant="secondary" className="text-xs">
            AI-powered
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((listing, index) => (
          <ListingCard
            key={listing.id}
            listing={toListingCardInput(listing)}
            currentUserId={userId}
            showLikeButton
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
