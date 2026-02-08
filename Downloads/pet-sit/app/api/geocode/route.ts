import { NextResponse } from "next/server"
import { attachRequestId } from "@/lib/observability/response"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { logError } from "@/lib/observability/logger"
import { captureServerException } from "@/lib/observability/sentry-server"
import { geocodeLocationServer } from "@/lib/utils/geocoding"
import { parseCityQuery } from "@/lib/geo/us-cities"
import { getClientIp } from "@/lib/net/client-ip"
import { checkRateLimit } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache/kv"
import { CACHE_POLICIES } from "@/lib/cache/policies"

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request.headers)
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const cityParam = searchParams.get("city")
  const stateParam = searchParams.get("state")
  const country = searchParams.get("country") ?? "US"

  let city = cityParam?.trim() || ""
  let state = stateParam?.trim() || ""

  if (!city && query) {
    const parsed = parseCityQuery(query)
    city = parsed.cityQuery
    state = parsed.state ?? state
  }

  if (!city || !state) {
    return attachRequestId(
      NextResponse.json(
        { coordinates: null, formattedAddress: null, error: "city_and_state_required" },
        { status: 400 },
      ),
      requestId,
    )
  }

  try {
    const ip = getClientIp(request.headers) ?? "unknown"
    const rl = await checkRateLimit({ key: `api:geocode:${ip}`, limit: 30, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ coordinates: null, formattedAddress: null, error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const cacheKey = `geocode:${country.toUpperCase()}:${city.toLowerCase().trim()}:${state.toUpperCase().trim()}`
    const cached = await cacheGet<{
      coordinates: { lat: number; lng: number } | null
      formattedAddress: string | null
      error?: string
    }>(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set("Cache-Control", CACHE_POLICIES.geocode.cacheControl)
      return attachRequestId(response, requestId)
    }

    const result = await geocodeLocationServer(city, state, country)
    const ttlSeconds = result.coordinates
      ? CACHE_POLICIES.geocode.successTtlSeconds
      : CACHE_POLICIES.geocode.missTtlSeconds
    await cacheSet(cacheKey, result, ttlSeconds)
    const response = NextResponse.json(result)
    response.headers.set("Cache-Control", CACHE_POLICIES.geocode.cacheControl)
    return attachRequestId(response, requestId)
  } catch (error) {
    logError("api.geocode.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(
      NextResponse.json({ coordinates: null, formattedAddress: null, error: "geocode_failed" }, { status: 500 }),
      requestId,
    )
  }
}
