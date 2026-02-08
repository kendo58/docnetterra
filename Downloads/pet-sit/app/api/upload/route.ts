import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getServerEnv } from "@/lib/env/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { logError } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { detectUploadMimeType, getUploadExtension, sanitizeUploadFolder } from "@/lib/utils/upload"
import { hasTrustedOrigin } from "@/lib/security/origin"

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request.headers)
  try {
    // Check authentication
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId)
    }

    if (!hasTrustedOrigin(request)) {
      return attachRequestId(NextResponse.json({ error: "forbidden_origin" }, { status: 403 }), requestId)
    }

    const rl = await checkRateLimit({ key: `api:upload:${user.id}`, limit: 30, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const formData = (await request.formData()) as unknown as FormData
    const fileValue = formData.get("file")
    const file = fileValue instanceof File ? fileValue : null

    if (!file) {
      return attachRequestId(NextResponse.json({ error: "No file provided" }, { status: 400 }), requestId)
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const declaredExtension = getUploadExtension(file.type)
    const fileHeader = new Uint8Array(await file.slice(0, 32).arrayBuffer())
    const detectedMimeType = detectUploadMimeType(fileHeader)
    const detectedExtension = detectedMimeType ? getUploadExtension(detectedMimeType) : null

    if (!declaredExtension && !detectedExtension) {
      return attachRequestId(NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 }), requestId)
    }

    if (declaredExtension && detectedExtension && declaredExtension !== detectedExtension) {
      return attachRequestId(NextResponse.json({ error: "File content does not match file type" }, { status: 400 }), requestId)
    }

    if (file.size > maxSize) {
      return attachRequestId(NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 }), requestId)
    }

    const extension = detectedExtension ?? declaredExtension
    if (!extension) {
      return attachRequestId(NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 }), requestId)
    }

    const uploadMimeType = detectedMimeType ?? file.type

    // Get folder from query params
    const { searchParams } = new URL(request.url)
    const folder = sanitizeUploadFolder(searchParams.get("folder"))

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const filename = `${folder}/${user.id}/${timestamp}-${randomId}.${extension}`

    const { SUPABASE_STORAGE_BUCKET } = getServerEnv()
    const bucket = SUPABASE_STORAGE_BUCKET || "uploads"

    const uploadAttempt = async () =>
      adminSupabase.storage.from(bucket).upload(filename, file, {
        cacheControl: "3600",
        contentType: uploadMimeType || undefined,
        upsert: false,
      })

    const { error: uploadError } = await uploadAttempt()

    if (uploadError) {
      logError("api.upload.storage_error", uploadError, { requestId })
      captureServerException(uploadError)
      const statusCode = (uploadError as { statusCode?: number }).statusCode
      const message = uploadError.message?.toLowerCase?.() ?? ""
      const bucketMissing =
        message.includes("bucket") && message.includes("not found") ? true : statusCode === 404 && message.includes("bucket")
      const friendlyMessage = bucketMissing
        ? `Storage bucket "${bucket}" not found. Run scripts/022_create_storage_bucket.sql or set SUPABASE_STORAGE_BUCKET.`
        : uploadError.message
      return attachRequestId(NextResponse.json({ error: friendlyMessage }, { status: 500 }), requestId)
    }

    const { data: publicUrlData } = adminSupabase.storage.from(bucket).getPublicUrl(filename)

    return attachRequestId(NextResponse.json({ url: publicUrlData.publicUrl }), requestId)
  } catch (error: unknown) {
    logError("api.upload.unhandled_error", error, { requestId })
    captureServerException(error)
    const message = error instanceof Error ? error.message : "Failed to upload file"
    return attachRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId)
  }
}
