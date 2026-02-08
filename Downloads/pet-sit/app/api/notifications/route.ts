import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { logError } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { hasTrustedOrigin } from "@/lib/security/origin"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers)
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId)
    }

    const rl = await checkRateLimit({ key: `api:notifications:get:${user.id}`, limit: 120, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      logError("api.notifications.query_error", error, { requestId })
      captureServerException(error)
      return attachRequestId(NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 }), requestId)
    }

    const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

    return attachRequestId(
      NextResponse.json({
        notifications: notifications || [],
        unreadCount,
      }),
      requestId,
    )
  } catch (error) {
    logError("api.notifications.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "Internal server error" }, { status: 500 }), requestId)
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers)
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId)
    }

    if (!hasTrustedOrigin(request)) {
      return attachRequestId(NextResponse.json({ error: "forbidden_origin" }, { status: 403 }), requestId)
    }

    const rl = await checkRateLimit({ key: `api:notifications:patch:${user.id}`, limit: 60, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return attachRequestId(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }), requestId)
    }

    const notificationId =
      body && typeof body === "object" && "notificationId" in body
        ? (body as { notificationId?: unknown }).notificationId
        : undefined

    if (typeof notificationId !== "string" || !UUID_PATTERN.test(notificationId)) {
      return attachRequestId(NextResponse.json({ error: "Invalid notification ID" }, { status: 400 }), requestId)
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) {
      logError("api.notifications.update_error", error, { requestId })
      captureServerException(error)
      return attachRequestId(NextResponse.json({ error: "Failed to update notification" }, { status: 500 }), requestId)
    }

    return attachRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    logError("api.notifications.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "Internal server error" }, { status: 500 }), requestId)
  }
}
