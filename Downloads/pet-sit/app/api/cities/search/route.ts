import { NextResponse } from "next/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { logError } from "@/lib/observability/logger"
import { parseCityQuery, searchUsCities } from "@/lib/geo/us-cities"
import { getClientIp } from "@/lib/net/client-ip"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request.headers)
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") ?? ""
  const { cityQuery, state } = parseCityQuery(query)
  const explicitState = searchParams.get("state") ?? undefined
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

  if (!cityQuery || cityQuery.length < 2) {
    return attachRequestId(NextResponse.json({ cities: [] }), requestId)
  }

  try {
    const ip = getClientIp(request.headers) ?? "unknown"
    const rl = await checkRateLimit({ key: `api:cities:${ip}`, limit: 600, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ cities: [], error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const cities = searchUsCities(cityQuery, { state: explicitState ?? state, limit })
    return attachRequestId(NextResponse.json({ cities }), requestId)
  } catch (error) {
    logError("api.cities.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ cities: [] }), requestId)
  }
}
