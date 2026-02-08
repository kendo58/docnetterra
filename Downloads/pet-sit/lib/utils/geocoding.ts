// Geocoding utilities for location-based matching

import { getUsCityCenterCoordinates } from "@/lib/geo/us-cities"

interface Coordinates {
  lat: number
  lng: number
}

interface GeocodingResult {
  coordinates: Coordinates | null
  formattedAddress: string | null
  error?: string
}

function buildGeocodeQuery(city: string, state: string, country = "US") {
  return `${city}, ${state}, ${country}`
}

async function geocodeLocationClient(city: string, state: string, country = "US"): Promise<GeocodingResult> {
  try {
    const params = new URLSearchParams({ city, state, country })
    const response = await fetch(`/api/geocode?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }
    return (await response.json()) as GeocodingResult
  } catch (error) {
    console.error("[sitswap] Geocoding error:", error)
    return { coordinates: null, formattedAddress: null, error: "Geocoding failed" }
  }
}

export async function geocodeLocationServer(city: string, state: string, country = "US"): Promise<GeocodingResult> {
  const normalizedCountry = country.toUpperCase()
  if (normalizedCountry === "US") {
    const coords = getUsCityCenterCoordinates(city, state)
    if (coords) {
      return {
        coordinates: coords,
        formattedAddress: `${city}, ${state}, ${normalizedCountry}`,
      }
    }
  }

  try {
    const query = encodeURIComponent(buildGeocodeQuery(city, state, country))
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: {
        "User-Agent": "SitSwap App",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const data = (await response.json()) as unknown

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as {
        lat?: string
        lon?: string
        display_name?: string
      }
      const lat = Number.parseFloat(first.lat ?? "")
      const lng = Number.parseFloat(first.lon ?? "")
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          coordinates: { lat, lng },
          formattedAddress: first.display_name ?? null,
        }
      }
    }

    if (Array.isArray(data) && data.length > 0) {
      return {
        coordinates: null,
        formattedAddress: null,
        error: "Location coordinates were invalid",
      }
    }

    return { coordinates: null, formattedAddress: null, error: "Location not found" }
  } catch (error) {
    console.error("[sitswap] Geocoding error:", error)
    return { coordinates: null, formattedAddress: null, error: "Geocoding failed" }
  }
}

// Geocode a city/state to coordinates using free Nominatim API
export async function geocodeLocation(city: string, state: string, country = "US"): Promise<GeocodingResult> {
  if (typeof window !== "undefined") {
    return geocodeLocationClient(city, state, country)
  }

  return geocodeLocationServer(city, state, country)
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Check if a location is within a radius of another location
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusMiles: number,
): boolean {
  const distance = calculateDistance(centerLat, centerLng, targetLat, targetLng)
  return distance <= radiusMiles
}

// Get a human-readable distance string
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return "Less than 1 mile"
  } else if (miles < 10) {
    return `${miles.toFixed(1)} miles`
  } else {
    return `${Math.round(miles)} miles`
  }
}
