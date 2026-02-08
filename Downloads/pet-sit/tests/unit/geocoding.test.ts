import { describe, expect, it, vi } from "vitest"
import { calculateDistance, formatDistance, geocodeLocation, isWithinRadius } from "@/lib/utils/geocoding"
import { getUsCityCenterCoordinates } from "@/lib/geo/us-cities"

describe("geocoding utils", () => {
  it("calculateDistance is symmetric and returns 0 for same point", () => {
    expect(calculateDistance(10, 10, 10, 10)).toBe(0)
    const ab = calculateDistance(47.6062, -122.3321, 45.5152, -122.6784)
    const ba = calculateDistance(45.5152, -122.6784, 47.6062, -122.3321)
    expect(ab).toBe(ba)
  })

  it("isWithinRadius works", () => {
    const within = isWithinRadius(47.6062, -122.3321, 47.61, -122.33, 5)
    expect(within).toBe(true)
    const far = isWithinRadius(47.6062, -122.3321, 34.0522, -118.2437, 100)
    expect(far).toBe(false)
  })

  it("formatDistance produces friendly output", () => {
    expect(formatDistance(0.5)).toBe("Less than 1 mile")
    expect(formatDistance(2.3)).toBe("2.3 miles")
    expect(formatDistance(12.7)).toBe("13 miles")
  })

  it("geocodeLocation falls back to Nominatim for non-US locations", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "47.6062", lon: "-122.3321", display_name: "Seattle, WA, USA" }],
    })
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const result = await geocodeLocation("Paris", "Ile-de-France", "FR")
    expect(fetchMock).toHaveBeenCalled()
    expect(result.coordinates).toEqual({ lat: 47.6062, lng: -122.3321 })
    expect(result.formattedAddress).toContain("Seattle")
  })

  it("accepts full US state names for city center lookups", () => {
    const coords = getUsCityCenterCoordinates("Seattle", "Washington")
    expect(coords).not.toBeNull()
    expect(typeof coords?.lat).toBe("number")
    expect(typeof coords?.lng).toBe("number")
  })
})
