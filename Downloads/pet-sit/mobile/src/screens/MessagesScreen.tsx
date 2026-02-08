import { useCallback, useEffect, useState } from "react"
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Screen } from "../components/Screen"
import { PillTabs } from "../components/PillTabs"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const tabs = [
  { key: "messages", label: "Messages", icon: "message-circle" },
  { key: "matches", label: "Matches", icon: "heart" },
]

const formatDateTime = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${date.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" },
  )}`
}

export function MessagesScreen() {
  const { session } = useAuth()
  const navigation = useNavigation<any>()
  const [tab, setTab] = useState("messages")
  const [threads, setThreads] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  const fetchThreads = useCallback(async () => {
    if (!session?.user.id) return
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, participant1_id, participant2_id, last_message_at")
      .or(`participant1_id.eq.${session.user.id},participant2_id.eq.${session.user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(30)

    if (!conversations || conversations.length === 0) {
      setThreads([])
      return
    }

    const otherUserIds = conversations.map((c) =>
      c.participant1_id === session.user.id ? c.participant2_id : c.participant1_id,
    )

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url")
      .in("id", otherUserIds)

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

    const messages = await Promise.all(
      conversations.map(async (conversation) => {
        const { data: last } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const otherId =
          conversation.participant1_id === session.user.id ? conversation.participant2_id : conversation.participant1_id

        const otherProfile = profileMap.get(otherId)
        return {
          id: conversation.id,
          name: otherProfile?.full_name ?? "SitSwap Member",
          lastMessage: last?.content ?? "Start the conversation.",
          lastAt: last?.created_at ?? conversation.last_message_at ?? "",
        }
      }),
    )

    setThreads(messages)
  }, [session?.user.id])

  const fetchMatches = useCallback(async () => {
    if (!session?.user.id) return
    setLoadingMatches(true)
    try {
      const { data: sitterMatches } = await supabase
        .from("matches")
        .select("id, listing_id, sitter_id, matched_at, homeowner_swipe, sitter_swipe, is_match")
        .eq("sitter_id", session.user.id)
        .eq("is_match", true)
        .eq("sitter_swipe", "like")
        .not("homeowner_swipe", "is", null)

      const { data: userListings } = await supabase.from("listings").select("id").eq("user_id", session.user.id)
      const listingIds = (userListings ?? []).map((listing) => listing.id)

      const { data: homeownerMatches } =
        listingIds.length > 0
          ? await supabase
              .from("matches")
              .select("id, listing_id, sitter_id, matched_at, is_match")
              .in("listing_id", listingIds)
              .eq("is_match", true)
              .eq("sitter_swipe", "like")
          : { data: [] }

      const merged = [...(sitterMatches ?? []), ...(homeownerMatches ?? [])]
      const uniqueMatches = Array.from(new Map(merged.map((match) => [match.id, match])).values())

      const enriched = await Promise.all(
        uniqueMatches.map(async (match) => {
          const { data: listing } = await supabase
            .from("listings")
            .select("id, title, photos, user_id, address:addresses(city,state)")
            .eq("id", match.listing_id)
            .maybeSingle()

          if (!listing) return null

          const otherUserId = match.sitter_id === session.user.id ? listing.user_id : match.sitter_id
          const { data: otherUser } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .eq("id", otherUserId)
            .maybeSingle()

          const { data: conversation } = await supabase
            .from("conversations")
            .select("id")
            .eq("match_id", match.id)
            .maybeSingle()

          return {
            id: match.id,
            matchedAt: match.matched_at,
            listing,
            user: otherUser,
            conversationId: conversation?.id ?? null,
          }
        }),
      )

      const cleaned = enriched.filter(Boolean) as any[]
      cleaned.sort((a, b) => new Date(b.matchedAt ?? 0).getTime() - new Date(a.matchedAt ?? 0).getTime())
      setMatches(cleaned)
    } finally {
      setLoadingMatches(false)
    }
  }, [session?.user.id])

  const openConversation = useCallback(
    async (conversationId?: string | null, match?: any) => {
      if (!session?.user.id) return
      if (conversationId) {
        navigation.navigate("Conversation", { conversationId })
        return
      }
      if (!match?.listing?.id || !match?.user?.id) return
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          match_id: match.id,
          participant1_id: session.user.id,
          participant2_id: match.user.id,
          listing_id: match.listing.id,
        })
        .select("id")
        .single()

      if (!error && data?.id) {
        navigation.navigate("Conversation", { conversationId: data.id })
      }
    },
    [navigation, session?.user.id],
  )

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useEffect(() => {
    if (tab === "matches") {
      fetchMatches()
    }
  }, [fetchMatches, tab])

  const renderMessageItem = ({ item }: { item: any }) => (
    <Pressable style={styles.card} onPress={() => navigation.navigate("Conversation", { conversationId: item.id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardMeta}>{formatDateTime(item.lastAt)}</Text>
      </View>
      <Text style={styles.cardText} numberOfLines={1}>
        {item.lastMessage}
      </Text>
    </Pressable>
  )

  const renderMatchItem = ({ item }: { item: any }) => {
    const photo = item.listing?.photos?.[0]
    const address = Array.isArray(item.listing?.address) ? item.listing?.address?.[0] : item.listing?.address
    return (
      <Pressable style={styles.matchCard} onPress={() => openConversation(item.conversationId, item)}>
        <View style={styles.matchImageWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.matchImage} />
          ) : (
            <View style={styles.matchImagePlaceholder}>
              <Feather name="image" size={18} color={colors.muted} />
            </View>
          )}
        </View>
        <View style={styles.matchBody}>
          <Text style={styles.matchTitle} numberOfLines={1}>
            {item.listing?.title ?? "Listing"}
          </Text>
          <Text style={styles.matchMeta} numberOfLines={1}>
            {address?.city ?? "City"}, {address?.state ?? "State"}
          </Text>
          <Text style={styles.matchTime} numberOfLines={1}>
            {item.matchedAt ? `Matched ${formatDateTime(item.matchedAt)}` : "New match"}
          </Text>
          <Text style={styles.matchName} numberOfLines={1}>
            {item.user?.full_name ?? "SitSwap Member"}
          </Text>
        </View>
        <View style={styles.matchAction}>
          <Feather name="message-circle" size={18} color={colors.primary} />
        </View>
      </Pressable>
    )
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>Stay in sync with your sitters and hosts.</Text>
      </View>

      <View style={styles.tabs}>
        <PillTabs options={tabs} value={tab} onChange={setTab} />
      </View>

      <FlatList
        data={tab === "messages" ? threads : matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={tab === "messages" ? renderMessageItem : renderMatchItem}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>
              {tab === "messages" ? "No messages yet" : loadingMatches ? "Loading matches..." : "No matches yet"}
            </Text>
            <Text style={styles.cardText}>
              {tab === "messages"
                ? "Start swiping to meet homeowners and sitters."
                : "Keep swiping to find your next sit or stay."}
            </Text>
          </View>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  tabs: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  cardText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  matchImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
  },
  matchImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  matchImagePlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  matchImageText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: colors.muted,
  },
  matchBody: {
    flex: 1,
    gap: 4,
  },
  matchTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  matchMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  matchTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  matchName: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.text,
  },
  matchAction: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
})
