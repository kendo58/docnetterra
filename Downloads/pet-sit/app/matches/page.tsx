"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { MatchCard } from "@/components/features/match-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { Heart, ArrowLeft, MessageCircle } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type MatchRow = {
  id: string
  listing_id: string
  sitter_id: string
  matched_at: string
}

type ListingRow = {
  id: string
  title: string | null
  photos: string[] | null
  user_id: string
  address_id: string | null
}

type ProfileSummary = {
  id: string
  full_name: string | null
  profile_photo_url: string | null
}

type ConversationRef = {
  id: string
}

type MatchUser = {
  id: string
  full_name?: string
  profile_photo_url?: string
  verification_tier?: string
}

type EnrichedMatch = {
  id: string
  listing: {
    id: string
    title: string
    photos: string[] | undefined
    address: { city: string; state: string } | undefined
  }
  user: MatchUser
  matched_at: string
  role: "sitter" | "homeowner"
  conversation_id: string | undefined
}

export default function MatchesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<EnrichedMatch[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()

    async function loadMatches() {
      try {
        console.log("[sitswap] Starting to load matches")

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          console.log("[sitswap] No user found, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[sitswap] User authenticated:", user.id)

        // Get matches where current user is the sitter
        const { data: sitterMatches, error: sitterError } = await supabase
          .from("matches")
          .select("*")
          .eq("sitter_id", user.id)
          .eq("is_match", true)
          .eq("sitter_swipe", "like") // Current user swiped right
          .not("homeowner_swipe", "is", null) // Other user also swiped
          .order("matched_at", { ascending: false })

        if (sitterError) {
          console.error("[sitswap] Sitter matches error:", sitterError)
        }

        // Get user's listings to find matches where they are the homeowner
        const { data: userListings } = await supabase.from("listings").select("id").eq("user_id", user.id)

        const listingIds = userListings?.map((l) => l.id) || []

        // Get matches where current user's listing was swiped on
        const { data: homeownerMatches, error: homeownerError } =
          listingIds.length > 0
            ? await supabase
                .from("matches")
                .select("*")
                .in("listing_id", listingIds)
                .eq("is_match", true)
                .eq("sitter_swipe", "like") // Other user swiped right on our listing
                .order("matched_at", { ascending: false })
            : { data: [], error: null }

        if (homeownerError) {
          console.error("[sitswap] Homeowner matches error:", homeownerError)
        }

        // Combine and dedupe matches
        const allMatchIds = new Set<string>()
        const allMatches: MatchRow[] = []
        ;[...(sitterMatches || []), ...(homeownerMatches || [])].forEach((match) => {
          if (!allMatchIds.has(match.id)) {
            allMatchIds.add(match.id)
            allMatches.push(match)
          }
        })

        console.log("[sitswap] Found", allMatches.length, "total matches")

        const enriched = await Promise.all(
          allMatches.map(async (match) => {
            try {
              const { data: listing } = await supabase
                .from("listings")
                .select("id, title, photos, user_id, address_id")
                .eq("id", match.listing_id)
                .maybeSingle<ListingRow>()

              if (!listing) return null

              const isSitter = match.sitter_id === user.id
              const otherUserId = isSitter ? listing.user_id : match.sitter_id

              const { data: otherUser } = await supabase
                .from("profiles")
                .select("id, full_name, profile_photo_url")
                .eq("id", otherUserId)
                .maybeSingle<ProfileSummary>()

              const otherUserSummary: MatchUser = {
                id: otherUserId,
                full_name: otherUser?.full_name ?? undefined,
                profile_photo_url: otherUser?.profile_photo_url ?? undefined,
              }

              let address: { city: string; state: string } | undefined
              if (listing.address_id) {
                const { data: addr } = await supabase
                  .from("addresses")
                  .select("city, state")
                  .eq("id", listing.address_id)
                  .maybeSingle()
                if (addr) {
                  address = {
                    city: addr.city ?? "",
                    state: addr.state ?? "",
                  }
                }
              }

              // Get or create conversation for this match
              const { data: conversation } = await supabase
                .from("conversations")
                .select("id")
                .eq("match_id", match.id)
                .maybeSingle<ConversationRef>()

              return {
                id: match.id,
                listing: {
                  id: listing.id,
                  title: listing.title ?? "Untitled listing",
                  photos: listing.photos ?? undefined,
                  address,
                },
                user: otherUserSummary,
                matched_at: match.matched_at,
                role: isSitter ? "sitter" : "homeowner",
                conversation_id: conversation?.id,
              }
            } catch (err) {
              console.error("[sitswap] Error enriching match:", err)
              return null
            }
          }),
        )

        const validMatches = enriched.filter((m): m is EnrichedMatch => m !== null)
        console.log("[sitswap] Enriched", validMatches.length, "matches")

        setMatches(validMatches)
      } catch (err: unknown) {
        console.error("[sitswap] Critical error loading matches:", err)
        setError(err instanceof Error ? err.message : "Failed to load matches")
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner className="h-8 w-8" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Error Loading Matches</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Messages
              </Button>
            </Link>
            <Link href="/swipe">
              <Button variant="ghost" size="sm">
                Swipe
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Your Matches</h1>
            <p className="mt-2 text-muted-foreground">People who liked you back - start a conversation!</p>
          </div>

          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title="No matches yet"
              description="Keep swiping to find your perfect pet sitting opportunity. A match happens when you both like each other!"
              actionLabel="Start Swiping"
              actionHref="/swipe"
            />
          )}
        </div>
      </div>
    </>
  )
}
