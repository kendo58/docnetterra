import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"
import { Screen } from "../components/Screen"
import { PillTabs } from "../components/PillTabs"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const modeTabs = [
  { key: "sitter", label: "Find Sits", icon: "home" },
  { key: "homeowner", label: "Looking for Stay", icon: "briefcase" },
]

export function SwipeScreen() {
  const { session } = useAuth()
  const [userType, setUserType] = useState<string>("sitter")
  const [mode, setMode] = useState("sitter")
  const [listings, setListings] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user.id) return
      const { data } = await supabase.from("profiles").select("user_type").eq("id", session.user.id).maybeSingle()
      const type = data?.user_type ?? "sitter"
      setUserType(type)
      if (type !== "both") {
        setMode(type)
      }
    }
    fetchProfile()
  }, [session?.user.id])

  const loadListings = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)

    const { data: swipedMatches } = await supabase.from("matches").select("listing_id").eq("sitter_id", session.user.id)
    const swipedIds = swipedMatches?.map((match) => match.listing_id) || []

    let query = supabase
      .from("listings")
      .select("id, title, description, listing_type, photos, user_id, address:addresses(city,state), user:profiles(full_name)")
      .eq("is_active", true)
      .neq("user_id", session.user.id)

    if (mode === "homeowner") {
      query = query.eq("listing_type", "stay")
    } else {
      query = query.neq("listing_type", "stay")
    }

    if (swipedIds.length > 0) {
      query = query.not("id", "in", `(${swipedIds.join(",")})`)
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(30)
    if (error) {
      console.warn("[sitswap-mobile] Failed to load swipe listings:", error.message)
    }

    setListings(data ?? [])
    setCurrentIndex(0)
    setLoading(false)
  }, [mode, session?.user.id])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const handleSwipe = async (direction: "left" | "right") => {
    if (!session?.user.id) return
    const listing = listings[currentIndex]
    if (!listing) return

    const swipeAction = direction === "right" ? "like" : "pass"
    const listingOwnerId = listing.user_id

    try {
      const { data: myListings } = await supabase.from("listings").select("id").eq("user_id", session.user.id)
      const myListingIds = myListings?.map((l) => l.id) || []

      let ownerLikedMyListing = false
      let ownerMatchRecord = null

      if (myListingIds.length > 0 && swipeAction === "like") {
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

      const isMatch = ownerLikedMyListing && swipeAction === "like"

      const { data: newMatch, error: insertError } = await supabase
        .from("matches")
        .insert({
          listing_id: listing.id,
          sitter_id: session.user.id,
          sitter_swipe: swipeAction,
          homeowner_swipe: ownerLikedMyListing ? "like" : null,
          is_match: isMatch,
          matched_at: isMatch ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (isMatch && ownerMatchRecord) {
        await supabase
          .from("matches")
          .update({
            homeowner_swipe: "like",
            is_match: true,
            matched_at: new Date().toISOString(),
          })
          .eq("id", ownerMatchRecord.id)

        await supabase.from("conversations").insert({
          match_id: newMatch.id,
          participant1_id: session.user.id,
          participant2_id: listingOwnerId,
          listing_id: listing.id,
        })

        await supabase.from("notifications").insert([
          {
            user_id: listingOwnerId,
            type: "match",
            title: "It's a Match!",
            body: "You matched! You both liked each other's listings.",
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
          {
            user_id: session.user.id,
            type: "match",
            title: "It's a Match!",
            body: `You matched with ${listing.user?.full_name || "someone"}!`,
            data: { listing_id: listing.id, match_id: newMatch.id },
          },
        ])

        Alert.alert("It's a Match!", `You and ${listing.user?.full_name || "a member"} liked each other.`)
      }
    } catch (error) {
      console.warn("[sitswap-mobile] Swipe error:", (error as Error)?.message ?? error)
    } finally {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const currentListing = listings[currentIndex]

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Swipe</Text>
        <Text style={styles.subtitle}>Like or pass to discover sits and stays.</Text>
        {listings.length > 0 ? (
          <Text style={styles.progress}>
            {Math.min(currentIndex + 1, listings.length)} of {listings.length}
          </Text>
        ) : null}
      </View>

      {userType === "both" ? (
        <View style={styles.modeTabs}>
          <PillTabs options={modeTabs} value={mode} onChange={setMode} />
        </View>
      ) : null}

      <View style={styles.deck}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Finding fresh listings...</Text>
          </View>
        ) : currentListing ? (
          <View style={styles.card}>
            {currentListing.photos?.[0] ? (
              <Image source={{ uri: currentListing.photos[0] }} style={styles.cardImage} />
            ) : (
              <View style={styles.cardImageFallback}>
                <Feather name="image" size={24} color={colors.muted} />
              </View>
            )}
            <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]} style={styles.cardOverlay}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>
                  {currentListing.listing_type === "stay" ? "Looking for Stay" : "Find a Sitter"}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{currentListing.title}</Text>
              <Text style={styles.cardMeta}>
                {currentListing.address?.[0]?.city ?? currentListing.address?.city ?? "City"},{" "}
                {currentListing.address?.[0]?.state ?? currentListing.address?.state ?? "State"}
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.empty}>
            <Feather name="compass" size={26} color={colors.muted} />
            <Text style={styles.emptyTitle}>No more listings</Text>
            <Text style={styles.emptyText}>Check back soon or refresh the deck.</Text>
            <Pressable style={styles.refreshButton} onPress={loadListings}>
              <Text style={styles.refreshButtonText}>Refresh deck</Text>
            </Pressable>
          </View>
        )}
      </View>

      {currentListing ? (
        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.passButton]} onPress={() => handleSwipe("left")}>
            <Feather name="x" size={20} color={colors.danger} />
          </Pressable>
          <Pressable style={[styles.actionButton, styles.likeButton]} onPress={() => handleSwipe("right")}>
            <Feather name="heart" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
  progress: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  modeTabs: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  deck: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    gap: 8,
  },
  cardBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  cardBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.text,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#fff",
  },
  cardMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#f7f7f7",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  empty: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  refreshButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  refreshButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#fff",
  },
  actions: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  passButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  likeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
})
