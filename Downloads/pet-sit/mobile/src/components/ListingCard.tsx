import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Feather } from "@expo/vector-icons"
import { colors } from "../theme"
import { fonts } from "../theme/typography"

type ListingCardProps = {
  listing: {
    id: string
    title: string
    description?: string | null
    listing_type?: string | null
    photos?: string[] | null
    address?: { city?: string | null; state?: string | null } | null
  }
  variant?: "default" | "compact"
  containerStyle?: StyleProp<ViewStyle>
  onPress?: () => void
}

export function ListingCard({ listing, variant = "default", containerStyle, onPress }: ListingCardProps) {
  const isStay = listing.listing_type === "stay"
  const badgeText = isStay ? "Looking for Stay" : "Find a Sitter"
  const badgeColor = isStay ? colors.accent : colors.primary
  const badgeTextColor = "#ffffff"
  const photo = listing.photos?.[0]
  const address = Array.isArray(listing.address) ? listing.address[0] : listing.address
  const compact = variant === "compact"

  return (
    <Pressable onPress={onPress} style={[styles.card, compact && styles.cardCompact, containerStyle]}>
      <View style={[styles.imageWrap, compact && styles.imageCompact]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Feather name="image" size={22} color={colors.muted} />
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
        </View>
      </View>
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Text style={styles.metaText}>
            {address?.city || "City"}, {address?.state || "State"}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {listing.description || "Cozy stay with trusted care."}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0f1a17",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardCompact: {
    width: 240,
    marginBottom: 0,
  },
  imageWrap: {
    width: "100%",
    height: 190,
    backgroundColor: "#f0f3f1",
  },
  imageCompact: {
    height: 140,
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
    left: 12,
    top: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.4,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  bodyCompact: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
})
