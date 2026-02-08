import { describe, expect, it } from "vitest"
import { getListingType, getOppositeListingType } from "@/lib/utils/listing-type"

describe("listing type utils", () => {
  it("treats property_type=looking_for_stay as stay (legacy compatibility)", () => {
    expect(getListingType({ listing_type: "pet_sitting", property_type: "looking_for_stay" })).toBe("stay")
  })

  it("uses listing_type when property_type is not the stay sentinel", () => {
    expect(getListingType({ listing_type: "pet_sitting", property_type: "house" })).toBe("pet_sitting")
    expect(getListingType({ listing_type: "stay", property_type: "looking_for_stay" })).toBe("stay")
  })

  it("maps legacy listing_type values", () => {
    expect(getListingType({ listing_type: "find_sitter", property_type: "house" })).toBe("pet_sitting")
    expect(getListingType({ listing_type: "looking_for_stay", property_type: "house" })).toBe("stay")
  })

  it("falls back to pet_sitting when listing_type is missing but property_type is present", () => {
    expect(getListingType({ property_type: "house" })).toBe("pet_sitting")
    expect(getListingType({ property_type: "apartment" })).toBe("pet_sitting")
  })

  it("returns opposite types for matching", () => {
    expect(getOppositeListingType("pet_sitting")).toBe("stay")
    expect(getOppositeListingType("stay")).toBe("pet_sitting")
    expect(getOppositeListingType("house_swap")).toBe(null)
  })
})
