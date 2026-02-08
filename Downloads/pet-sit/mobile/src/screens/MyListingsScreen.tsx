import { useEffect, useState } from "react"
import { FlatList, StyleSheet, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Screen } from "../components/Screen"
import { ListingCard } from "../components/ListingCard"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

export function MyListingsScreen() {
  const { session } = useAuth()
  const navigation = useNavigation<any>()
  const [listings, setListings] = useState<any[]>([])

  useEffect(() => {
    const fetchListings = async () => {
      if (!session?.user.id) return
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, description, listing_type, photos, address:addresses(city,state)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })

      if (!error) {
        setListings(data ?? [])
      } else {
        console.warn("[sitswap-mobile] Failed to load my listings:", error.message)
      }
    }

    fetchListings()
  }, [session?.user.id])

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <Text style={styles.subtitle}>Manage your sits and stays</Text>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyText}>Create a listing on the web to see it here.</Text>
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
  list: {
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
    textAlign: "center",
  },
})
