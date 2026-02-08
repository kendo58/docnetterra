"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { ConversationList } from "@/components/features/conversation-list"
import { Spinner } from "@/components/ui/spinner"
import { MessageCircle, ArrowLeft, Users, Search, Plus, RefreshCw } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

type ConversationRow = {
  id: string
  participant1_id: string
  participant2_id: string
  listing_id: string | null
  last_message_at: string | null
}

type ConversationUser = {
  id: string
  full_name: string | null
  profile_photo_url: string | null
}

type ConversationListing = {
  id: string
  title: string | null
  photos: string[] | null
  user_id: string
}

type ConversationMessage = {
  content: string
  created_at: string
  sender_id: string
}

type EnrichedConversation = ConversationRow & {
  otherUser: ConversationUser | null
  listing: ConversationListing | null
  lastMessage: ConversationMessage | null
  unreadCount: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<EnrichedConversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<EnrichedConversation[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  const loadConversations = useCallback(
    async (showLoading = true) => {
      const supabase = createBrowserClient()

      try {
        if (showLoading) setRefreshing(true)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push("/auth/login")
          return
        }

        setUserId(user.id)

        const { data: convs, error: convsError } = await supabase
          .from("conversations")
          .select("*")
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .returns<ConversationRow[]>()

        if (convsError) throw convsError

        const enriched = await Promise.all(
          (convs || []).map(async (conv) => {
            try {
              const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id

              const { data: otherUser } = await supabase
                .from("profiles")
                .select("id, full_name, profile_photo_url")
                .eq("id", otherUserId)
                .maybeSingle<ConversationUser>()

              let listing = null
              if (conv.listing_id) {
                const { data: listingData } = await supabase
                  .from("listings")
                  .select("id, title, photos, user_id")
                  .eq("id", conv.listing_id)
                  .maybeSingle<ConversationListing>()
                listing = listingData
              }

              const { data: lastMessage } = await supabase
                .from("messages")
                .select("content, created_at, sender_id")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle<ConversationMessage>()

              const { count: unreadCount } = await supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .eq("conversation_id", conv.id)
                .eq("receiver_id", user.id)
                .eq("is_read", false)

              return {
                ...conv,
                otherUser,
                listing,
                lastMessage,
                unreadCount: unreadCount || 0,
              }
            } catch (err) {
              console.error("[sitswap] Error enriching conversation:", err)
              return null
            }
          }),
        )

        const validConvs = enriched.filter((c): c is EnrichedConversation => c !== null && c.otherUser !== null)
        setConversations(validConvs)
        setFilteredConversations(validConvs)
      } catch (err: unknown) {
        console.error("[sitswap] Critical error loading conversations:", err)
        setError(err instanceof Error ? err.message : "Failed to load conversations")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [router],
  )

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      console.log("[sitswap] Messages page received new message event:", event.detail)
      // Refresh conversations to update unread counts and last message
      loadConversations(false)
    }

    window.addEventListener("new-message-received", handleNewMessage as EventListener)
    return () => {
      window.removeEventListener("new-message-received", handleNewMessage as EventListener)
    }
  }, [loadConversations])

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = conversations.filter((conv) => {
      const nameMatch = conv.otherUser?.full_name?.toLowerCase().includes(query)
      const listingMatch = conv.listing?.title?.toLowerCase().includes(query)
      const messageMatch = conv.lastMessage?.content?.toLowerCase().includes(query)
      return nameMatch || listingMatch || messageMatch
    })
    setFilteredConversations(filtered)
  }, [searchQuery, conversations])

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Spinner className="h-8 w-8 mx-auto" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive">Error Loading Messages</h2>
              <p className="mt-2 text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Matches
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Messages</h1>
                {totalUnread > 0 && (
                  <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {totalUnread}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => loadConversations()}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="mt-1 text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/swipe">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Find Matches
              </Button>
            </Link>
          </div>

          {/* Search */}
          {conversations.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>
          )}

          {/* Conversation List */}
          {filteredConversations.length > 0 && userId ? (
            <ConversationList conversations={filteredConversations} userId={userId} />
          ) : conversations.length > 0 && searchQuery ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No results found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try a different search term</p>
                <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Start by finding matches on the swipe page. Once you match with someone, you can message them here.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <Link href="/swipe">
                    <Button className="gap-2">
                      <Users className="h-4 w-4" />
                      Start Swiping
                    </Button>
                  </Link>
                  <Link href="/matches">
                    <Button variant="outline">View Matches</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
