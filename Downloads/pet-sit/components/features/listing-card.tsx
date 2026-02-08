"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { MapPin, Calendar, Dog, Cat, Heart, Sparkles, Wrench, Loader2, Briefcase, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Listing, Pet } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { launchConfetti } from "@/lib/confetti"
import { isStayListing as isStayListingType } from "@/lib/utils/listing-type"

interface ListingCardProps {
  listing: Listing & {
    address?: { city: string; state: string }
    pets?: Pet[]
    tasks?: Array<{ task_type: string }>
    user?: { full_name?: string; verification_tier?: string }
  }
  onLike?: () => void
  showLikeButton?: boolean
  currentUserId?: string
  index?: number
}

export function ListingCard({ listing, onLike, showLikeButton = false, currentUserId, index = 0 }: ListingCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const router = useRouter()

  const mainPhoto = listing.photos?.[0] || "/modern-home.png"
  const petIcons = {
    dog: Dog,
    cat: Cat,
  }

  const hasTasks = listing.tasks && listing.tasks.length > 0
  const taskCount = listing.tasks?.length || 0

  const isStayListing = isStayListingType(listing)
  const listingBadgeClass = `rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm ${
    isStayListing ? "bg-[#6c8fb6] text-white" : "bg-primary text-primary-foreground"
  }`

  const isOwnListing = currentUserId && listing.user_id === currentUserId
  const canShowLikeButton = showLikeButton && currentUserId && !isOwnListing

  useEffect(() => {
    const checkExistingLike = async () => {
      if (!currentUserId || !canShowLikeButton) return

      const { data } = await supabase
        .from("matches")
        .select("id, sitter_swipe")
        .eq("listing_id", listing.id)
        .eq("sitter_id", currentUserId)
        .maybeSingle()

      if (data && data.sitter_swipe === "like") {
        setIsLiked(true)
      }
    }

    checkExistingLike()
  }, [currentUserId, listing.id, canShowLikeButton, supabase])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like listings",
        variant: "destructive",
      })
      router.push("/auth/login")
      return
    }

    if (isOwnListing) {
      return
    }

    setIsLoading(true)
    const newLikeState = !isLiked
    const swipeAction = newLikeState ? "like" : "pass"
    const listingOwnerId = listing.user_id

    try {
      // Check for existing match record
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("*")
        .eq("listing_id", listing.id)
        .eq("sitter_id", currentUserId)
        .maybeSingle()

      if (existingMatch) {
        // Update existing match
        const { error: updateError } = await supabase
          .from("matches")
          .update({ sitter_swipe: swipeAction })
          .eq("id", existingMatch.id)

        if (updateError) throw updateError

        setIsLiked(newLikeState)
        toast({
          title: newLikeState ? "Liked!" : "Unliked",
          description: newLikeState ? "You'll be notified if they like you back" : "You've removed your like",
        })
        onLike?.()
        setIsLoading(false)
        return
      }

      // Get current user's listings to check for mutual likes
      const { data: myListings } = await supabase.from("listings").select("id").eq("user_id", currentUserId)

      const myListingIds = myListings?.map((l) => l.id) || []

      // Check if listing owner has liked any of current user's listings
      let ownerLikedMyListing = false
      let ownerMatchRecord = null

      if (myListingIds.length > 0 && newLikeState) {
        const { data: ownerMatches } = await supabase
          .from("matches")
          .select("*")
          .eq("sitter_id", listingOwnerId)
          .in("listing_id", myListingIds)
          .eq("sitter_swipe", "like")

        if (ownerMatches && ownerMatches.length > 0) {
          ownerLikedMyListing = true
          ownerMatchRecord = ownerMatches[0]
        }
      }

      // Determine if this creates a match
      const isMatch = ownerLikedMyListing && newLikeState

      // Create the match record
      const { data: newMatch, error: insertError } = await supabase
        .from("matches")
        .insert({
          listing_id: listing.id,
          sitter_id: currentUserId,
          sitter_swipe: swipeAction,
          homeowner_swipe: ownerLikedMyListing ? "like" : null,
          is_match: isMatch,
          matched_at: isMatch ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // If it's a match, update owner's record and create conversation
      if (isMatch && ownerMatchRecord) {
        await supabase
          .from("matches")
          .update({
            homeowner_swipe: "like",
            is_match: true,
            matched_at: new Date().toISOString(),
          })
          .eq("id", ownerMatchRecord.id)

        // Create conversation
        await supabase.from("conversations").insert({
          match_id: newMatch.id,
        })

        // Notify both users
        await supabase.from("notifications").insert([
          {
            user_id: listingOwnerId,
            type: "match",
            title: "It's a Match!",
            body: "You both liked each other's listings!",
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
          {
            user_id: currentUserId,
            type: "match",
            title: "It's a Match!",
            body: `You matched with ${listing.user?.full_name || "someone"}!`,
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
        ])

        toast({
          title: "It's a Match!",
          description: `You and ${listing.user?.full_name || "the listing owner"} liked each other!`,
        })
        void launchConfetti("match")
      } else if (newLikeState) {
        toast({
          title: "Liked!",
          description: "You'll be notified if they like you back",
        })
      }

      setIsLiked(newLikeState)
      onLike?.()
    } catch (error) {
      console.error("[sitswap] Error handling like:", error)
      toast({
        title: "Error",
        description: "Failed to save your like. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card
      className="overflow-hidden card-interactive animate-fade-in-up group rounded-2xl border-0 p-0 shadow-none gap-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Skeleton placeholder while image loads */}
          {!imageLoaded && <div className="absolute inset-0 skeleton" />}
          <Image
            src={mainPhoto || "/placeholder.svg"}
            alt={listing.title}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className={listingBadgeClass}>
              {isStayListing ? (
                <>
                  <Briefcase className="h-3 w-3 mr-1" />
                  Looking for Stay
                </>
              ) : (
                <>
                  <Home className="h-3 w-3 mr-1" />
                  Find a Sitter
                </>
              )}
            </Badge>
          </div>

          {canShowLikeButton && (
            <Button
              size="icon"
              variant="secondary"
              className={`absolute top-3 right-3 rounded-full transition-all duration-300 hover:scale-110 ${
                isLiked ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-white/90 hover:bg-white"
              }`}
              onClick={handleLike}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={`h-4 w-4 transition-transform duration-300 ${isLiked ? "fill-current scale-110" : ""}`}
                />
              )}
            </Button>
          )}

          {listing.user?.verification_tier === "premium" && (
            <div className="absolute bottom-3 left-3 animate-bounce-in">
              <BadgeIcon type="premium" />
            </div>
          )}
        </div>
      </CardHeader>

      <Link href={`/listings/${listing.id}`}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">
                {listing.address?.city}, {listing.address?.state}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-1">{listing.description}</p>

            <div className="space-y-2">
              {!isStayListing && listing.pets && listing.pets.length > 0 && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {listing.pets.slice(0, 2).map((pet) => {
                      const Icon = petIcons[pet.species as keyof typeof petIcons] || Dog
                      return (
                        <Badge
                          key={pet.id}
                          variant="secondary"
                          className="gap-1 text-xs hover:bg-secondary/80 transition-colors"
                        >
                          <Icon className="h-3 w-3" />
                          <span>{pet.name}</span>
                        </Badge>
                      )
                    })}
                    {listing.pets.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{listing.pets.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {!isStayListing && hasTasks && (
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-primary shrink-0" />
                  <Badge variant="outline" className="text-xs">
                    {taskCount} {taskCount === 1 ? "task" : "tasks"}
                  </Badge>
                </div>
              )}

              {isStayListing && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Offering pet sitting & chores</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Available now</span>
          </div>
        </CardFooter>
      </Link>
    </Card>
  )
}
