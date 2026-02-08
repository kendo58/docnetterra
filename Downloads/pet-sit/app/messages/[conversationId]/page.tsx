import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfessionalChat } from "@/components/features/professional-chat"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getListingType } from "@/lib/utils/listing-type"

function ChatLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
      <p className="mt-4 text-muted-foreground">Loading conversation...</p>
    </div>
  )
}

function InvalidConversation({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Conversation Unavailable</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button asChild>
          <Link href="/messages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Link>
        </Button>
      </div>
    </div>
  )
}

async function ChatContent({ conversationId }: { conversationId: string }) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  console.log("[sitswap] Loading conversation:", conversationId)

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*, match:matches(*), listing:listings(id, title, user_id, listing_type, property_type)")
    .eq("id", conversationId)
    .maybeSingle()

  if (convError) {
    console.error("[sitswap] Conversation fetch error:", convError)
    notFound()
  }

  if (!conversation) {
    console.log("[sitswap] Conversation not found")
    notFound()
  }

  console.log("[sitswap] Conversation data:", {
    id: conversation.id,
    participant1_id: conversation.participant1_id,
    participant2_id: conversation.participant2_id,
    match_id: conversation.match_id,
    listing_id: conversation.listing_id,
  })

  let participant1 = conversation.participant1_id
  let participant2 = conversation.participant2_id

  // If participants are not set, try to get them from the match
  if ((!participant1 || !participant2) && conversation.match) {
    const match = conversation.match
    // Get sitter_id and homeowner (listing owner) from match
    if (match.sitter_id && match.listing_id) {
      participant1 = participant1 || match.sitter_id

      // Get listing owner from the listing
      const { data: listing } = await supabase
        .from("listings")
        .select("user_id")
        .eq("id", match.listing_id)
        .maybeSingle()

      if (listing?.user_id) {
        participant2 = participant2 || listing.user_id
      }
    }
  }

  // Check if we have valid participants
  if (!participant1 || !participant2) {
    console.log("[sitswap] Missing participant IDs, cannot determine other user")
    return (
      <InvalidConversation message="This conversation is missing participant information. Please start a new conversation from your matches." />
    )
  }

  // Check access - user must be a participant
  const hasAccess = participant1 === user.id || participant2 === user.id

  if (!hasAccess) {
    console.log("[sitswap] User does not have access to this conversation")
    redirect("/messages")
  }

  // Get other user info
  const otherUserId = participant1 === user.id ? participant2 : participant1

  console.log("[sitswap] Other user ID:", otherUserId)

  const { data: otherUser, error: userError } = await supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url")
    .eq("id", otherUserId)
    .maybeSingle()

  if (userError) {
    console.error("[sitswap] Failed to fetch other user:", userError)
  }

  // Get listings owned by current user and other user
  const [{ data: myListings }, { data: theirListings }] = await Promise.all([
    supabase.from("listings").select("id").eq("user_id", user.id),
    supabase.from("listings").select("id").eq("user_id", otherUserId),
  ])

  const myListingIds = myListings?.map((l) => l.id) || []
  const theirListingIds = theirListings?.map((l) => l.id) || []

  let swapConfirmed = false

  // Check if there's a confirmed booking between the two users
  if (myListingIds.length > 0 || theirListingIds.length > 0) {
    const conditions: string[] = []

    // User is sitter on other's listing
    if (theirListingIds.length > 0) {
      conditions.push(`and(sitter_id.eq.${user.id},listing_id.in.(${theirListingIds.join(",")}))`)
    }

    // Other user is sitter on user's listing
    if (myListingIds.length > 0) {
      conditions.push(`and(sitter_id.eq.${otherUserId},listing_id.in.(${myListingIds.join(",")}))`)
    }

    if (conditions.length > 0) {
      const { data: confirmedSwap } = await supabase
        .from("bookings")
        .select("id")
        .in("status", ["confirmed", "accepted"])
        .or(conditions.join(","))
        .limit(1)
        .maybeSingle()

      swapConfirmed = !!confirmedSwap
    }
  }

  const recipientName = otherUser?.full_name || "User"
  let listing = conversation.listing ?? null

  if (!listing && conversation.listing_id) {
    const { data: listingData } = await supabase
      .from("listings")
      .select("id, title, user_id, listing_type, property_type")
      .eq("id", conversation.listing_id)
      .maybeSingle()
    listing = listingData ?? null
  }

  const listingType = getListingType(listing)
  const listingTitle = listing?.title ?? null
  const listingId = conversation.listing_id ?? listing?.id ?? null
  const directListingConversation = Boolean(listingId && !conversation.match_id)
  const isListingOwner = Boolean(listing?.user_id && listing?.user_id === user.id)

  let bookingId: string | null = null

  if (directListingConversation && listingId && listingType === "pet_sitting" && listing?.user_id) {
    const sitterId = listing.user_id === user.id ? otherUserId : user.id
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .eq("sitter_id", sitterId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    bookingId = existingBooking?.id ?? null
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <ProfessionalChat
        conversationId={conversationId}
        recipientId={otherUserId}
        recipientName={recipientName}
        recipientAvatar={otherUser?.profile_photo_url}
        currentUserId={user.id}
        swapConfirmed={swapConfirmed}
        directListingConversation={directListingConversation}
        listingId={listingId ?? undefined}
        listingTitle={listingTitle}
        listingType={listingType}
        isListingOwner={isListingOwner}
        bookingId={bookingId ?? undefined}
        className="h-full"
      />
    </div>
  )
}

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params

  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatContent conversationId={conversationId} />
    </Suspense>
  )
}
