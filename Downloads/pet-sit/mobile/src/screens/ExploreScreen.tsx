import { useCallback, useEffect, useState } from "react"
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"
import { AppHeader } from "../components/AppHeader"
import { Screen } from "../components/Screen"
import { SearchBar } from "../components/SearchBar"
import { PillTabs } from "../components/PillTabs"
import { ListingCard } from "../components/ListingCard"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const tabs = [
  { key: "all", label: "All", icon: "compass" },
  { key: "pet_sitting", label: "Find a Sitter", icon: "home" },
  { key: "stay", label: "Looking for Stay", icon: "briefcase" },
]

const quickFilters = ["Verified", "Flexible dates", "House chores", "Pet care"]

export function ExploreScreen() {
  const navigation = useNavigation<any>()
  const { session } = useAuth()
  const [tab, setTab] = useState("all")
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchListings = useCallback(async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, description, listing_type, photos, user_id, address:addresses(city,state)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) {
      console.warn("[sitswap-mobile] Failed to load listings:", error.message)
      return
    }

    const userId = session?.user.id
    const filtered = userId ? (data ?? []).filter((l) => l.user_id !== userId) : data ?? []
    setListings(filtered)
  }, [session?.user.id])

  useEffect(() => {
    fetchListings().finally(() => setLoading(false))
  }, [fetchListings])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchListings()
    setRefreshing(false)
  }

  const visibleListings = listings.filter((listing) => {
    if (tab === "all") return true
    if (tab === "pet_sitting") return listing.listing_type !== "stay"
    return listing.listing_type === tab
  })

  const showFeatured = visibleListings.length > 4
  const featuredListings = showFeatured ? visibleListings.slice(0, 5) : []
  const feedListings = showFeatured ? visibleListings.slice(5) : visibleListings

  return (
    <Screen>
      <FlatList
        data={feedListings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppHeader title="Explore" subtitle="Find cozy stays and trusted sitters." />
            <LinearGradient colors={[colors.surfaceWarm, colors.surfaceMuted]} style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Trusted</Text>
                </View>
                <Text style={styles.heroEyebrow}>SitSwap</Text>
              </View>
              <Text style={styles.heroTitle}>Your next sit or stay is closer than you think.</Text>
              <Text style={styles.heroSubtitle}>
                Swap care and cozy homes with verified members across the country.
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>10k+</Text>
                  <Text style={styles.heroStatLabel}>Members</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>4.9</Text>
                  <Text style={styles.heroStatLabel}>Avg rating</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>48h</Text>
                  <Text style={styles.heroStatLabel}>Avg reply</Text>
                </View>
              </View>
              <Pressable style={styles.heroButton} onPress={() => navigation.navigate("Swipe")}>
                <Feather name="heart" size={16} color="#fff" />
                <Text style={styles.heroButtonText}>Start swiping</Text>
              </Pressable>
            </LinearGradient>
            <SearchBar placeholder="Search by city, dates, or tasks" onPress={() => navigation.navigate("Search")} />
            <View style={styles.filterRow}>
              {quickFilters.map((label) => (
                <View key={label} style={styles.filterChip}>
                  <Text style={styles.filterText}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.tabs}>
              <PillTabs options={tabs} value={tab} onChange={setTab} />
            </View>
            {showFeatured ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured near you</Text>
                <Text style={styles.sectionLink} onPress={() => navigation.navigate("Search")}>
                  See all
                </Text>
              </View>
            ) : null}
            {showFeatured ? (
              <FlatList
                horizontal
                data={featuredListings}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                renderItem={({ item }) => (
                  <ListingCard
                    listing={item}
                    variant="compact"
                    onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })}
                  />
                )}
              />
            ) : null}
            <Text style={styles.sectionTitle}>{loading ? "Loading listings..." : "Latest listings"}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyText}>Try another filter or check back soon.</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 16,
    gap: 14,
  },
  hero: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  heroBadgeText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  heroEyebrow: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroStat: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  heroStatValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  heroStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  heroButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
  },
  heroButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },
  tabs: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  sectionLink: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  featuredList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  empty: {
    marginTop: 40,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
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
    marginTop: 6,
  },
})
