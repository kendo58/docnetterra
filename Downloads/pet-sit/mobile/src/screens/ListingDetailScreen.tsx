import { useEffect, useState } from "react"
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { Screen } from "../components/Screen"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

type Params = { listingId: string }

export function ListingDetailScreen() {
  const { session } = useAuth()
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<Record<string, Params>, string>>()
  const listingId = route.params?.listingId
  const [listing, setListing] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, user_id, title, description, listing_type, photos, address:addresses(city,state), user:profiles(id, full_name, profile_photo_url, verification_tier), tasks:tasks(task_type, description), pets:pets(name, species)",
        )
        .eq("id", listingId)
        .single()

      if (!error) setListing(data)
      setLoading(false)
    }

    fetchListing()
  }, [listingId])

  const handlePrimaryAction = async () => {
    if (!session?.user.id || !listing?.user_id) return
    if (listing.user_id === session.user.id) {
      Alert.alert("This is your listing", "You can manage this listing from the web dashboard.")
      return
    }
    setSubmitting(true)
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .or(
          `and(participant1_id.eq.${session.user.id},participant2_id.eq.${listing.user_id}),and(participant1_id.eq.${listing.user_id},participant2_id.eq.${session.user.id})`,
        )
        .maybeSingle()

      let conversationId = existing?.id
      if (!conversationId) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            listing_id: listing.id,
            participant1_id: session.user.id,
            participant2_id: listing.user_id,
          })
          .select("id")
          .single()

        conversationId = created?.id
      }

      if (conversationId) {
        navigation.navigate("Conversation", { conversationId })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </Screen>
    )
  }

  if (!listing) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Listing not found.</Text>
        </View>
      </Screen>
    )
  }

  const isStay = listing.listing_type === "stay"
  const badgeColor = isStay ? colors.accent : colors.primary
  const photo = listing.photos?.[0]
  const address = Array.isArray(listing.address) ? listing.address[0] : listing.address
  const tasks = listing.tasks ?? []
  const pets = listing.pets ?? []
  const tags = [
    ...tasks.map((task: any) => task.task_type || task.description).filter(Boolean),
    ...pets.map((pet: any) => (pet.species ? `${pet.species} care` : pet.name)).filter(Boolean),
  ]
  const uniqueTags = Array.from(new Set(tags)).slice(0, 6)

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Feather name="image" size={22} color={colors.muted} />
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{isStay ? "Looking for Stay" : "Find a Sitter"}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={14} color={colors.muted} />
            <Text style={styles.metaText}>
              {address?.city || "City"}, {address?.state || "State"}
            </Text>
          </View>
          <Text style={styles.description}>{listing.description || "Cozy stay with trusted care."}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the host</Text>
            <View style={styles.hostCard}>
              <View style={styles.hostAvatar}>
                <Feather name="user" size={18} color="#fff" />
              </View>
              <View style={styles.hostBody}>
                <Text style={styles.hostName}>{listing.user?.full_name || "SitSwap Member"}</Text>
                <Text style={styles.hostMeta}>
                  {listing.user?.verification_tier ? `${listing.user.verification_tier} verified` : "Community member"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What I can offer</Text>
            {uniqueTags.length > 0 ? (
              <View style={styles.tagRow}>
                {uniqueTags.map((tag: string) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionText}>Pet sitting, house chores, and dependable care.</Text>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, listing.user_id === session?.user.id && styles.primaryButtonDisabled]}
            onPress={handlePrimaryAction}
            disabled={submitting || listing.user_id === session?.user.id}
          >
            <Text
              style={[
                styles.primaryButtonText,
                listing.user_id === session?.user.id && styles.primaryButtonTextDisabled,
              ]}
            >
              {listing.user_id === session?.user.id
                ? "This is your listing"
                : submitting
                  ? "Opening chat..."
                  : isStay
                    ? "Invite to Stay"
                    : "Request a Sit"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  imageWrap: {
    height: 260,
    backgroundColor: "#f0f3f1",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    left: 16,
    top: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  description: {
    fontFamily: fonts.regular,
    color: colors.muted,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  sectionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hostBody: {
    flex: 1,
  },
  hostName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  hostMeta: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  tagText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  primaryButtonTextDisabled: {
    color: colors.muted,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
})
