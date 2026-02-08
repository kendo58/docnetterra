import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

type RateLimitRow = {
  allowed: boolean
  remaining: number
  reset_at: string
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(options: {
  key: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  const limit = Math.max(1, Math.floor(options.limit))
  const windowSeconds = Math.max(1, Math.floor(options.windowSeconds))
  const failClosed = process.env.NODE_ENV === "production"

  const fallbackResetAt = new Date(Date.now() + windowSeconds * 1000)

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .rpc("check_rate_limit", { p_key: options.key, p_limit: limit, p_window_seconds: windowSeconds })
      .single<RateLimitRow>()

    if (error) {
      // If the SQL script hasn't been applied yet, fail open in non-production and fail closed in production.
      if (error.code === "42883" || error.code === "42P01") {
        if (failClosed) {
          return { allowed: false, remaining: 0, resetAt: fallbackResetAt }
        }
        return { allowed: true, remaining: limit, resetAt: fallbackResetAt }
      }
      throw error
    }

    const resetAt = new Date(data.reset_at)
    return { allowed: Boolean(data.allowed), remaining: Number(data.remaining) || 0, resetAt }
  } catch (error) {
    if (failClosed) {
      console.error("[sitswap] Rate limiter unavailable in production; denying request:", error)
      return { allowed: false, remaining: 0, resetAt: fallbackResetAt }
    }

    console.warn("[sitswap] Rate limiter unavailable; allowing request:", error)
    return { allowed: true, remaining: limit, resetAt: fallbackResetAt }
  }
}
