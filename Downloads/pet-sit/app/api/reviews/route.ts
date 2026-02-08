import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateRequestId } from "@/lib/observability/request-id"
import { attachRequestId } from "@/lib/observability/response"
import { captureServerException } from "@/lib/observability/sentry-server"
import { logError } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/net/client-ip"
import { hasTrustedOrigin } from "@/lib/security/origin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export async function POST(request: NextRequest) {
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

    const rl = await checkRateLimit({ key: `api:reviews:post:${user.id}`, limit: 30, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const formData = (await request.formData()) as unknown as FormData
    const getString = (key: string) => {
      const value = formData.get(key)
      return typeof value === "string" ? value : ""
    }

    const bookingId = getString("bookingId")
    const revieweeId = getString("revieweeId")
    const rating = Number.parseInt(getString("rating"), 10)
    const communicationRating = Number.parseInt(getString("communication_rating"), 10)
    const accuracyRating = Number.parseInt(getString("accuracy_rating"), 10)
    const cleanlinessRating = Number.parseInt(getString("cleanliness_rating"), 10)
    const responsibilityRating = Number.parseInt(getString("responsibility_rating"), 10)
    const reviewText = getString("review_text").trim()
    const wouldRecommend = getString("would_recommend") === "true"
    const ratings = [rating, communicationRating, accuracyRating, cleanlinessRating, responsibilityRating]

    if (
      !bookingId ||
      !revieweeId ||
      !reviewText ||
      ratings.some((value) => Number.isNaN(value))
    ) {
      return attachRequestId(NextResponse.json({ error: "Invalid review submission" }, { status: 400 }), requestId)
    }

    if (ratings.some((value) => value < 1 || value > 5)) {
      return attachRequestId(NextResponse.json({ error: "Ratings must be between 1 and 5" }, { status: 400 }), requestId)
    }

    if (!isUuid(bookingId) || !isUuid(revieweeId)) {
      return attachRequestId(NextResponse.json({ error: "Invalid booking or user identifier" }, { status: 400 }), requestId)
    }

    if (reviewText.length < 5 || reviewText.length > 2000) {
      return attachRequestId(
        NextResponse.json({ error: "Review text must be between 5 and 2000 characters" }, { status: 400 }),
        requestId,
      )
    }

    // Verify the booking exists and user is authorized
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, sitter_id, listing:listings(user_id)")
      .eq("id", bookingId)
      .single()

    if (!booking) {
      return attachRequestId(NextResponse.json({ error: "Sit not found" }, { status: 404 }), requestId)
    }

    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing
    if (!listing) {
      return attachRequestId(NextResponse.json({ error: "Sit not found" }, { status: 404 }), requestId)
    }

    if (booking.sitter_id !== user.id && listing.user_id !== user.id) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 403 }), requestId)
    }

    if (booking.status !== "completed") {
      return attachRequestId(NextResponse.json({ error: "Reviews can only be left after completed sits" }, { status: 400 }), requestId)
    }

    const expectedRevieweeId = booking.sitter_id === user.id ? listing.user_id : booking.sitter_id
    if (revieweeId !== expectedRevieweeId) {
      return attachRequestId(NextResponse.json({ error: "Invalid review recipient" }, { status: 400 }), requestId)
    }

    // Check if review already exists
    const { data: existingReview, error: existingReviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("reviewer_id", user.id)
      .maybeSingle()

    if (existingReviewError) {
      logError("api.reviews.existing_review_error", existingReviewError, { requestId })
      captureServerException(existingReviewError)
      return attachRequestId(NextResponse.json({ error: "Failed to validate review" }, { status: 500 }), requestId)
    }

    if (existingReview) {
      return attachRequestId(NextResponse.json({ error: "Review already exists" }, { status: 400 }), requestId)
    }

    // Create the review
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        communication_rating: communicationRating,
        accuracy_rating: accuracyRating,
        cleanliness_rating: cleanlinessRating,
        responsibility_rating: responsibilityRating,
        review_text: reviewText,
        would_recommend: wouldRecommend,
        is_flagged: false,
      })
      .select()
      .single()

    if (error) {
      logError("api.reviews.create_error", error, { requestId })
      captureServerException(error)
      return attachRequestId(NextResponse.json({ error: "Failed to create review" }, { status: 500 }), requestId)
    }

    // Create notification for reviewee
    await supabase.from("notifications").insert({
      user_id: revieweeId,
      type: "new_review",
      title: "New Review",
      body: `You received a ${rating}-star review!`,
      data: { review_id: review.id, booking_id: bookingId },
    })

    return attachRequestId(NextResponse.redirect(new URL("/dashboard", request.url)), requestId)
  } catch (error) {
    logError("api.reviews.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "Internal server error" }, { status: 500 }), requestId)
  }
}

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers)
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return attachRequestId(NextResponse.json({ error: "User ID required" }, { status: 400 }), requestId)
    }

    if (!isUuid(userId)) {
      return attachRequestId(NextResponse.json({ error: "Invalid user ID" }, { status: 400 }), requestId)
    }

    const ip = getClientIp(request.headers) ?? "unknown"
    const rl = await checkRateLimit({ key: `api:reviews:get:${ip}:${userId}`, limit: 120, windowSeconds: 60 })
    if (!rl.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
      const response = NextResponse.json({ error: "rate_limited" }, { status: 429 })
      response.headers.set("Retry-After", String(retryAfterSeconds))
      return attachRequestId(response, requestId)
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(
          full_name,
          profile_photo_url,
          verification_tier
        )
      `)
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      logError("api.reviews.query_error", error, { requestId })
      captureServerException(error)
      return attachRequestId(NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 }), requestId)
    }

    // Calculate average ratings
    const safeReviews = reviews ?? []
    const totalReviews = safeReviews.length
    const avgRating = totalReviews > 0 ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0
    const recommendationRate = totalReviews > 0 ? safeReviews.filter((r) => r.would_recommend).length / totalReviews : 0

    return attachRequestId(
      NextResponse.json({
        reviews: safeReviews,
        stats: {
          total: totalReviews,
          averageRating: avgRating,
          recommendationRate,
        },
      }),
      requestId,
    )
  } catch (error) {
    logError("api.reviews.unhandled_error", error, { requestId })
    captureServerException(error)
    return attachRequestId(NextResponse.json({ error: "Internal server error" }, { status: 500 }), requestId)
  }
}
