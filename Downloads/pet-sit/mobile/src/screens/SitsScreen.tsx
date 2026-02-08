import { useCallback, useEffect, useState } from "react"
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { Screen } from "../components/Screen"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#f7efe1", text: colors.warning },
  confirmed: { bg: "#e1ece8", text: colors.success },
  accepted: { bg: "#e1ece8", text: colors.success },
  cancelled: { bg: "#f3e7e6", text: colors.danger },
  completed: { bg: "#e3edf7", text: colors.accentDark },
}

export function SitsScreen() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchBookings = useCallback(async () => {
    if (!session?.user.id) return
    const sitterBookings = await supabase
      .from("bookings")
      .select("id, start_date, end_date, status, listing:listings(title)")
      .eq("sitter_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30)

    if (sitterBookings.error) {
      console.warn("[sitswap-mobile] Failed to load sitter bookings:", sitterBookings.error.message)
    }

    const { data: myListings } = await supabase.from("listings").select("id").eq("user_id", session.user.id)
    const listingIds = (myListings ?? []).map((listing) => listing.id)

    const ownerBookings =
      listingIds.length > 0
        ? await supabase
            .from("bookings")
            .select("id, start_date, end_date, status, listing:listings(title)")
            .in("listing_id", listingIds)
            .order("created_at", { ascending: false })
            .limit(30)
        : { data: [], error: null }

    if (ownerBookings.error) {
      console.warn("[sitswap-mobile] Failed to load host bookings:", ownerBookings.error.message)
    }

    const combined = [...(sitterBookings.data ?? []), ...(ownerBookings.data ?? [])]
    const deduped = Array.from(new Map(combined.map((booking) => [booking.id, booking])).values())
    setBookings(deduped)
  }, [session])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchBookings()
    setRefreshing(false)
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Sits</Text>
        <Text style={styles.subtitle}>Track requests, confirmations, and stays.</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = item.status ?? "pending"
          const badge = statusStyles[status] ?? { bg: colors.muted, text: colors.text }
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.listing?.title ?? "Sit"}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{status}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color={colors.muted} />
                <Text style={styles.metaText}>
                  {item.start_date} → {item.end_date}
                </Text>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sits yet</Text>
            <Text style={styles.emptyText}>When you book or host, your sits will appear here.</Text>
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
    paddingVertical: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
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
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
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
