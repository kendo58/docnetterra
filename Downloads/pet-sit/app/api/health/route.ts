import { NextResponse } from "next/server"
import { getPublicEnv } from "@/lib/env/public"
import { getServerEnv } from "@/lib/env/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"

export function GET(request: Request) {
  const requestId = getOrCreateRequestId(request.headers)
  const issues: string[] = []

  try {
    getPublicEnv()
  } catch {
    issues.push("public_env_invalid")
  }

  try {
    const serverEnv = getServerEnv()
    if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) issues.push("SUPABASE_SERVICE_ROLE_KEY_missing")
    if (serverEnv.STRIPE_SECRET_KEY && !serverEnv.STRIPE_WEBHOOK_SECRET) {
      issues.push("STRIPE_WEBHOOK_SECRET_missing")
    }
    if (process.env.NODE_ENV === "production" && serverEnv.ALLOW_MANUAL_BOOKING_PAYMENTS) {
      issues.push("ALLOW_MANUAL_BOOKING_PAYMENTS_enabled_in_production")
    }
    if (process.env.NODE_ENV === "production" && process.env.SITSWAP_WORKER_ENABLED !== "true") {
      issues.push("SITSWAP_WORKER_ENABLED_missing_in_production")
    }
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.ADMIN_APP_URL &&
      !process.env.NEXT_PUBLIC_ADMIN_APP_URL
    ) {
      issues.push("ADMIN_APP_URL_missing_in_production")
    }
  } catch {
    issues.push("server_env_invalid")
  }

  const status = issues.length === 0 ? "ok" : "degraded"

  return attachRequestId(
    NextResponse.json({
      status,
      time: new Date().toISOString(),
      issues,
    }),
    requestId,
  )
}
