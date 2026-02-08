export const STAY_PROPERTY_TYPE = "looking_for_stay" as const

export const LISTING_TYPES = ["pet_sitting", "stay", "house_swap"] as const

export type ListingType = (typeof LISTING_TYPES)[number]

export function normalizeListingType(value: unknown): ListingType | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  if (normalized === "pet_sitting" || normalized === "pet-sitting" || normalized === "petsitting") return "pet_sitting"
  if (normalized === "stay" || normalized === "looking_for_stay" || normalized === "looking-for-stay") return "stay"
  if (normalized === "house_swap" || normalized === "house-swap" || normalized === "houseswap") return "house_swap"

  // Legacy values (pre listing_type column)
  if (normalized === "find_sitter") return "pet_sitting"

  return null
}

type ListingTypeInput = {
  listing_type?: unknown
  property_type?: unknown
}

/**
 * Determine the primary listing type.
 *
 * Notes:
 * - `property_type="looking_for_stay"` is treated as a strong signal for `stay`
 *   for backwards compatibility with older rows.
 */
export function getListingType(listing: ListingTypeInput | null | undefined): ListingType | null {
  if (!listing) return null

  const explicit = normalizeListingType(listing.listing_type)

  if (typeof listing.property_type === "string") {
    const propertyType = listing.property_type.trim().toLowerCase()

    // Backwards compatibility: older rows use property_type as the stay sentinel.
    if (propertyType === STAY_PROPERTY_TYPE) return "stay"

    // Prefer an explicit listing_type if present.
    if (explicit) return explicit

    // If property_type is present and not the stay sentinel, treat as a pet_sitting listing.
    // This keeps the app functional for older DB schemas that don't yet have `listings.listing_type`.
    if (propertyType) return "pet_sitting"
  }

  return explicit
}

export function isStayListing(listing: ListingTypeInput | null | undefined): boolean {
  return getListingType(listing) === "stay"
}

export function isPetSittingListing(listing: ListingTypeInput | null | undefined): boolean {
  return getListingType(listing) === "pet_sitting"
}

export function getOppositeListingType(type: ListingType | null): ListingType | null {
  if (!type) return null
  if (type === "pet_sitting") return "stay"
  if (type === "stay") return "pet_sitting"
  return null
}

export function getListingTypeLabel(type: ListingType | null): string {
  if (type === "stay") return "Looking for Stay"
  if (type === "pet_sitting") return "Find a Sitter"
  if (type === "house_swap") return "House Swap"
  return "Listing"
}
