import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { log, logError } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeSearchFallbackTerm } from "@/lib/utils/search-filters"
import { cacheGet, cacheSet } from "@/lib/cache/kv"
import { CACHE_POLICIES } from "@/lib/cache/policies"

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000"

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers)
  const startedAt = Date.now()
  try {
    log("info", "api.search.request", { requestId })
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId)
    }

    const rl = await checkRateLimit({ key: `api:search:${user.id}`, limit: 120, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") ?? "").trim()
    const city = (searchParams.get("city") ?? "").trim()
    const state = (searchParams.get("state") ?? "").trim()
    const petType = (searchParams.get("pet_type") ?? "").trim()
    const taskType = (searchParams.get("task_type") ?? "").trim()
    const startDate = (searchParams.get("start") ?? "").trim()
    const endDate = (searchParams.get("end") ?? "").trim()
    const limitParam = searchParams.get("limit")
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitParam ?? "50", 10) || 50))

    const searchCacheKey = [
      "search",
      "v1",
      user.id,
      q.toLowerCase(),
      city.toLowerCase(),
      state.toLowerCase(),
      petType.toLowerCase(),
      taskType.toLowerCase(),
      startDate,
      endDate,
      String(limit),
    ].join(":")

    const cached = await cacheGet<{
      listings: unknown[]
      total: number
    }>(searchCacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set("Cache-Control", CACHE_POLICIES.search.cacheControl)
      response.headers.set("x-sitswap-cache", "hit")
      return attachRequestId(response, requestId)
    }

    const wantsDateFilter = Boolean(startDate && endDate)
    const wantsLocationFilter = Boolean(city || state)

    const today = new Date().toISOString().slice(0, 10)
    const { data: bookedRows, error: bookedError } = await supabase
      .from("availability")
      .select("listing_id")
      .eq("is_booked", true)
      .gte("end_date", today)

    if (bookedError) {
      logError("api.search.booked_listings_error", bookedError, { requestId })
    }

    const bookedListingIds = Array.from(new Set((bookedRows ?? []).map((row) => row.listing_id))).filter(Boolean)

    const addressJoin = `address:addresses!listings_address_id_fkey${wantsLocationFilter ? "!inner" : ""}(city,state,country,latitude,longitude)`
    const petsJoin = `pets${petType ? "!inner" : ""}(species)`
    const tasksJoin = `tasks${taskType ? "!inner" : ""}(task_type)`
    const availabilityJoin = `availability${wantsDateFilter ? "!inner" : ""}(start_date,end_date,is_booked)`

    const select = `
      id,
      user_id,
      title,
      description,
      listing_type,
      created_at,
      ${addressJoin},
      ${petsJoin},
      ${tasksJoin},
      ${availabilityJoin}
    `

    const buildQuery = (opts: { useFts: boolean }) => {
      let listingsQuery = supabase.from("listings").select(select, { count: "exact" }).eq("is_active", true)
      listingsQuery = listingsQuery.neq("user_id", user.id)

      if (bookedListingIds.length > 0) {
        listingsQuery = listingsQuery.not("id", "in", `(${bookedListingIds.join(",")})`)
      }

      if (wantsLocationFilter) {
        if (state) listingsQuery = listingsQuery.eq("address.state", state)
        if (city) listingsQuery = listingsQuery.ilike("address.city", city)
      }

      if (wantsDateFilter) {
        listingsQuery = listingsQuery
          .eq("availability.is_booked", false)
          .lte("availability.start_date", startDate)
          .gte("availability.end_date", endDate)
      }

      if (petType) listingsQuery = listingsQuery.ilike("pets.species", petType)
      if (taskType) listingsQuery = listingsQuery.eq("tasks.task_type", taskType)

      if (q && opts.useFts) {
        listingsQuery = listingsQuery.textSearch("search_document", q, { type: "websearch", config: "english" })
      } else if (q) {
        const safeQuery = sanitizeSearchFallbackTerm(q)
        if (safeQuery.length === 0) {
          listingsQuery = listingsQuery.eq("id", EMPTY_UUID)
        } else {
          listingsQuery = listingsQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
        }
      }

      return listingsQuery.order("created_at", { ascending: false }).limit(limit)
    }

    let { data: listings, error, count } = await buildQuery({ useFts: true })
    if (error && q) {
      const fallback = await buildQuery({ useFts: false })
      listings = fallback.data
      error = fallback.error
      count = fallback.count
    }

    if (error) {
      logError("api.search.query_error", error, { requestId })
      captureServerException(error)
      return attachRequestId(NextResponse.json({ error: "Search failed" }, { status: 500 }), requestId)
    }

    const payload = {
      listings: listings ?? [],
      total: count ?? (listings?.length ?? 0),
    }

    await cacheSet(searchCacheKey, payload, CACHE_POLICIES.search.resultTtlSeconds)

    const response = NextResponse.json(payload)
    response.headers.set("Cache-Control", CACHE_POLICIES.search.cacheControl)
    response.headers.set("x-sitswap-cache", "miss")
    attachRequestId(response, requestId)
    log("info", "api.search.response", {
      requestId,
      durationMs: Date.now() - startedAt,
      total: count ?? (listings?.length ?? 0),
    })
    return response
  } catch (error) {
    logError("api.search.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "Internal server error" }, { status: 500 }), requestId)
  }
}
