import { useCallback, useState } from "react"
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Screen } from "../components/Screen"
import { ListingCard } from "../components/ListingCard"
import { PillTabs } from "../components/PillTabs"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const typeTabs = [
  { key: "all", label: "All", icon: "compass" },
  { key: "pet_sitting", label: "Find a Sitter", icon: "home" },
  { key: "stay", label: "Looking for Stay", icon: "briefcase" },
]

const citySuggestions = ["New York, NY", "Austin, TX", "Seattle, WA", "Denver, CO"]

export function SearchScreen() {
  const { session } = useAuth()
  const navigation = useNavigation<any>()
  const [query, setQuery] = useState("")
  const [city, setCity] = useState("")
  const [tab, setTab] = useState("all")
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    const searchText = query.trim()
    const cityText = city.trim()

    let search = supabase
      .from("listings")
      .select("id, title, description, listing_type, photos, user_id, address:addresses(city,state)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50)

    if (tab !== "all") {
      search = search.eq("listing_type", tab)
    }

    if (searchText) {
      search = search.or(`title.ilike.%${searchText}%,description.ilike.%${searchText}%`)
    }

    if (cityText) {
      search = search.ilike("address.city", `%${cityText}%`)
    }

    const { data, error } = await search
    if (error) {
      console.warn("[sitswap-mobile] Search failed:", error.message)
    } else {
      const userId = session?.user.id
      const filtered = userId ? (data ?? []).filter((l) => l.user_id !== userId) : data ?? []
      setListings(filtered)
    }
    setLoading(false)
  }, [city, query, session?.user.id, tab])

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Look for sits by city, dates, or keywords.</Text>
      </View>

      <View style={styles.tabs}>
        <PillTabs options={typeTabs} value={tab} onChange={setTab} />
      </View>

      <View style={styles.searchCard}>
        <View style={styles.inputRow}>
          <Feather name="search" size={16} color={colors.muted} />
          <TextInput
            placeholder="Pets, chores, keywords"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        <View style={styles.inputRow}>
          <Feather name="map-pin" size={16} color={colors.muted} />
          <TextInput
            placeholder="City (optional)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={city}
            onChangeText={setCity}
            onSubmitEditing={handleSearch}
          />
        </View>
        <View style={styles.actionRow}>
          <Text style={styles.helperText}>{loading ? "Searching..." : "Tap enter to search"}</Text>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Run search</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.suggestions}>
        <Text style={styles.suggestionLabel}>Popular cities</Text>
        <View style={styles.suggestionRow}>
          {citySuggestions.map((label) => (
            <Pressable key={label} style={styles.suggestionChip} onPress={() => setCity(label)}>
              <Text style={styles.suggestionText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No results yet</Text>
              <Text style={styles.emptyText}>Try a different keyword or city.</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  searchCard: {
    margin: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fbfbfa",
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  searchButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  searchButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#fff",
  },
  suggestions: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  suggestionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  suggestionText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  empty: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
  },
})
