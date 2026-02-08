"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { hasConstraintName, hasPostgresCode, isMissingColumnError } from "@/lib/utils/supabase-errors"
import { calculateBookingFees, CLEANING_FEE, SERVICE_FEE_PER_NIGHT } from "@/lib/pricing/fees"
import { sendBookingCancelledEmail, sendBookingConfirmation, sendBookingRequestEmail } from "@/app/actions/email"

const MAX_BOOKING_NIGHTS = 365

function parseDateOnly(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export async function createBooking(formData: FormData) {
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const listingId = formData.get("listing_id") as string
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const insuranceSelected = formData.get("insurance_selected") === "true"
  const insurancePlanType = formData.get("insurance_plan_type") as string | null
  const parsedInsuranceCost = insuranceSelected ? Number.parseFloat(String(formData.get("insurance_cost") ?? "")) : 0
  const insuranceCost = insuranceSelected ? parsedInsuranceCost : null

  if (!listingId || !startDate || !endDate) {
    return { error: "Missing required booking details." }
  }

  const startDay = parseDateOnly(startDate)
  const endDay = parseDateOnly(endDate)
  if (!startDay || !endDay) {
    return { error: "Invalid booking dates." }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (startDay < today) {
    return { error: "Start date cannot be in the past." }
  }

  if (endDay <= startDay) {
    return { error: "End date must be after the start date." }
  }

  const maxEndDate = new Date(startDay)
  maxEndDate.setDate(maxEndDate.getDate() + MAX_BOOKING_NIGHTS)
  if (endDay > maxEndDate) {
    return { error: `Bookings cannot exceed ${MAX_BOOKING_NIGHTS} nights.` }
  }

  if (insuranceSelected && !insurancePlanType) {
    return { error: "Please select an insurance plan." }
  }

  if (insuranceSelected && (!Number.isFinite(parsedInsuranceCost) || parsedInsuranceCost < 0)) {
    return { error: "Invalid insurance amount." }
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return { error: "Listing not found" }
  }

  if (listing.user_id === user.id) {
    return { error: "You can't book your own listing." }
  }

  const { data: conflictingBooking, error: conflictError } = await adminSupabase
    .from("bookings")
    .select("id")
    .eq("listing_id", listingId)
    .in("status", ["confirmed", "accepted"])
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1)
    .maybeSingle()

  if (conflictError) {
    console.warn("[sitswap] Error checking booking conflicts:", conflictError)
    return { error: "Unable to verify date availability right now. Please try again." }
  }

  if (conflictingBooking) {
    return { error: "Those dates are no longer available." }
  }

  const feeSummary = calculateBookingFees({
    startDate,
    endDate,
    serviceFeePerNight: SERVICE_FEE_PER_NIGHT,
    cleaningFee: CLEANING_FEE,
    insuranceCost: insuranceCost ?? 0,
  })

  const bookingPayload = {
    listing_id: listingId,
    sitter_id: user.id,
    requested_by: user.id,
    start_date: startDate,
    end_date: endDate,
    status: "pending",
    insurance_selected: insuranceSelected,
    insurance_plan_type: insurancePlanType,
    insurance_cost: insuranceCost,
    service_fee_per_night: feeSummary.serviceFeePerNight,
    cleaning_fee: feeSummary.cleaningFee,
    service_fee_total: feeSummary.serviceFeeTotal,
    total_fee: feeSummary.totalFee,
    cash_due: feeSummary.totalFee,
    points_applied: 0,
    payment_status: "unpaid",
  }

  let bookingResponse = await supabase.from("bookings").insert(bookingPayload).select().single()

  if (bookingResponse.error && isMissingColumnError(bookingResponse.error, "requested_by")) {
    const { requested_by: _requestedBy, ...legacyPayload } = bookingPayload
    bookingResponse = await supabase.from("bookings").insert(legacyPayload).select().single()
  }

  if (
    bookingResponse.error &&
    (hasPostgresCode(bookingResponse.error, "23P01") || hasConstraintName(bookingResponse.error, "bookings_no_overlap_active"))
  ) {
    return { error: "Those dates are no longer available." }
  }

  if (
    bookingResponse.error &&
    (hasPostgresCode(bookingResponse.error, "23514") || hasConstraintName(bookingResponse.error, "bookings_start_before_end"))
  ) {
    return { error: "End date must be after the start date." }
  }

  if (bookingResponse.error) {
    console.error("[sitswap] Error creating booking:", bookingResponse.error)
    return { error: bookingResponse.error.message }
  }

  const booking = bookingResponse.data

  if (listing) {
    await adminSupabase.from("notifications").insert({
      user_id: listing.user_id,
      type: "booking_request",
      title: "New Sit Request",
      body: "You have a new sit request for your listing",
      data: { booking_id: booking.id, listing_id: listingId, url: `/sits/${booking.id}` },
    })

    try {
      await sendBookingRequestEmail(booking.id)
    } catch (emailError) {
      console.warn("[sitswap] Failed to send booking request email:", emailError)
    }
  }

  revalidatePath("/bookings")
  revalidatePath("/sits")
  return { booking, error: null }
}

export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  const details = String(formData.get("details") ?? "").trim()

  if (!bookingId) {
    return { error: "Missing booking ID." }
  }

  if (!reason) {
    return { error: "Please select a cancellation reason." }
  }

  if (reason === "Other" && !details) {
    return { error: "Please add a short note for the cancellation." }
  }

  const finalReason = details ? `${reason}: ${details}` : reason
  return updateBookingStatus(bookingId, "cancelled", { reason: finalReason })
}

export async function updateBookingStatus(bookingId: string, status: string, options?: { reason?: string }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get booking to verify authorization
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      *,
      listing:listings(
        id,
        title,
        user_id,
        user:profiles!listings_user_id_fkey(id, full_name, email)
      ),
      sitter:profiles!bookings_sitter_id_fkey(id, full_name, email)
    `,
    )
    .eq("id", bookingId)
    .single()

  if (!booking) {
    return { error: "Sit not found" }
  }

  const allowedStatuses = new Set(["confirmed", "accepted", "declined", "cancelled", "completed"])

  if (!allowedStatuses.has(status)) {
    return { error: "Invalid booking status" }
  }

  const currentStatus = String(booking.status ?? "pending")
  if (currentStatus === status) {
    return { error: null }
  }

  const terminalStatuses = new Set(["declined", "cancelled", "completed", "refunded"])
  if (terminalStatuses.has(currentStatus)) {
    return { error: `This sit is already ${currentStatus}.` }
  }

  // Only participants can manage bookings
  const isHomeowner = booking.listing.user_id === user.id
  const isSitter = booking.sitter_id === user.id

  if (!isHomeowner && !isSitter) {
    return { error: "Unauthorized" }
  }

  const listingTitle = booking.listing?.title ?? ""
  const homeownerProfile = booking.listing?.user as { full_name?: string | null } | null
  const sitterProfile = booking.sitter as { full_name?: string | null } | null
  const cancellerName =
    user.id === booking.sitter_id
      ? sitterProfile?.full_name || "The sitter"
      : homeownerProfile?.full_name || "The homeowner"

  const requesterId = booking.requested_by ?? booking.sitter_id
  const responderId = requesterId === booking.sitter_id ? booking.listing.user_id : booking.sitter_id
  const isResponder = user.id === responderId
  const sitterCanConfirm = isSitter && booking.insurance_selected

  if ((status === "accepted" || status === "declined") && currentStatus !== "pending") {
    return { error: "This sit is no longer awaiting a response." }
  }

  if (status === "confirmed" && !["pending", "accepted"].includes(currentStatus)) {
    return { error: "This sit cannot be confirmed from its current status." }
  }

  if (status === "cancelled" && !["pending", "accepted", "confirmed"].includes(currentStatus)) {
    return { error: "This sit cannot be cancelled from its current status." }
  }

  if ((status === "accepted" || status === "declined") && !isResponder) {
    return { error: "Only the other party can respond to this request" }
  }

  if (status === "confirmed" && !isResponder && !sitterCanConfirm) {
    return { error: "Only the other party can confirm this sit" }
  }

  const feeSummary = calculateBookingFees({
    startDate: booking.start_date,
    endDate: booking.end_date,
    serviceFeePerNight: Number(booking.service_fee_per_night ?? SERVICE_FEE_PER_NIGHT),
    cleaningFee: Number(booking.cleaning_fee ?? CLEANING_FEE),
    insuranceCost: Number(booking.insurance_cost ?? 0),
  })

  const pointsApplied = Number(booking.points_applied ?? 0)
  const pointsValue = pointsApplied * feeSummary.serviceFeePerNight
  const cashDue = Math.max(feeSummary.totalFee - pointsValue, 0)
  const paymentStatus = booking.payment_status ?? "unpaid"
  const cancellationReason = options?.reason?.trim() || null

  if (status === "completed") {
    if (!["confirmed", "accepted"].includes(currentStatus)) {
      return { error: "Only confirmed sits can be marked as completed" }
    }

    const endDate = new Date(booking.end_date)
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    if (today < endDay) {
      return { error: "This sit can't be completed until the end date" }
    }

    if (paymentStatus !== "paid") {
      return { error: "Payment is required before completing this sit" }
    }
  }

  const updatePayload: Record<string, unknown> = {
    status,
    ...(status === "cancelled" && {
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason,
    }),
  }

  if (status === "confirmed" || status === "accepted") {
    if (!booking.payment_status) updatePayload.payment_status = "unpaid"
    if (booking.service_fee_total == null) updatePayload.service_fee_total = feeSummary.serviceFeeTotal
    if (booking.total_fee == null) updatePayload.total_fee = feeSummary.totalFee
    if (booking.cash_due == null) updatePayload.cash_due = cashDue
    if (booking.service_fee_per_night == null) updatePayload.service_fee_per_night = feeSummary.serviceFeePerNight
    if (booking.cleaning_fee == null) updatePayload.cleaning_fee = feeSummary.cleaningFee
  }

  if ((status === "cancelled" || status === "declined") && paymentStatus === "paid") {
    updatePayload.payment_status = "refunded"
    updatePayload.refunded_at = new Date().toISOString()
  }

  const { data: updatedBooking, error } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[sitswap] Error updating booking:", error)
    return { error: error.message }
  }

  if (!updatedBooking) {
    return { error: "This sit was updated by someone else. Refresh and try again." }
  }

  if (status === "confirmed" || status === "accepted") {
    const otherUserId = isHomeowner ? booking.sitter_id : booking.listing.user_id
    const conversationFilters = [
      booking.match_id ? `match_id.eq.${booking.match_id}` : null,
      `and(listing_id.eq.${booking.listing_id},participant1_id.eq.${user.id},participant2_id.eq.${otherUserId})`,
      `and(listing_id.eq.${booking.listing_id},participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`,
    ].filter(Boolean)

    if (conversationFilters.length > 0) {
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(conversationFilters.join(","))
        .limit(1)
        .maybeSingle()

      if (!existingConversation) {
        const { error: conversationError } = await supabase.from("conversations").insert({
          match_id: booking.match_id,
          listing_id: booking.listing_id,
          participant1_id: user.id,
          participant2_id: otherUserId,
          last_message_at: new Date().toISOString(),
        })

        if (conversationError) {
          console.warn("[sitswap] Failed to create conversation for confirmed sit:", conversationError)
        }
      }
    }

    const adminSupabase = createAdminClient()
    const { error: availabilityError } = await adminSupabase
      .from("availability")
      .update({ is_booked: true })
      .eq("listing_id", booking.listing_id)
      .lte("start_date", booking.end_date)
      .gte("end_date", booking.start_date)

    if (availabilityError) {
      console.warn("[sitswap] Failed to update availability for confirmed sit:", availabilityError)
    }
  }

  if (status === "cancelled" || status === "declined") {
    if (paymentStatus === "paid" && pointsApplied > 0) {
      const adminSupabase = createAdminClient()
      const { error: pointsRefundError } = await adminSupabase.from("points_ledger").insert({
        user_id: booking.sitter_id,
        booking_id: booking.id,
        points_delta: pointsApplied,
        reason: "booking_refund_points",
      })

      if (pointsRefundError) {
        console.warn("[sitswap] Failed to refund points:", pointsRefundError)
      }
    }

    if (booking.points_awarded && booking.points_awarded > 0) {
      const adminSupabase = createAdminClient()
      const { error: revokeError } = await adminSupabase.from("points_ledger").insert({
        user_id: booking.listing.user_id,
        booking_id: booking.id,
        points_delta: -Math.abs(booking.points_awarded),
        reason: "booking_cancelled_revoke",
      })

      if (revokeError) {
        console.warn("[sitswap] Failed to revoke points:", revokeError)
      } else {
        await adminSupabase.from("bookings").update({ points_awarded: 0 }).eq("id", booking.id)
      }
    }

    const adminSupabase = createAdminClient()
    const { error: availabilityError } = await adminSupabase
      .from("availability")
      .update({ is_booked: false })
      .eq("listing_id", booking.listing_id)
      .lte("start_date", booking.end_date)
      .gte("end_date", booking.start_date)

    if (availabilityError) {
      console.warn("[sitswap] Failed to release availability:", availabilityError)
    }
  }

  if (status === "completed" && (!booking.points_awarded || booking.points_awarded === 0)) {
    const adminSupabase = createAdminClient()
    const { error: awardError } = await adminSupabase.from("points_ledger").insert({
      user_id: booking.listing.user_id,
      booking_id: booking.id,
      points_delta: feeSummary.nights,
      reason: "booking_completed_points",
    })

    if (awardError) {
      console.warn("[sitswap] Failed to award points:", awardError)
    } else {
      await adminSupabase.from("bookings").update({ points_awarded: feeSummary.nights }).eq("id", booking.id)
    }
  }

  // Send notification to the other party (and confirm cancellation to the requester)
  const adminSupabase = createAdminClient()
  const notifyUserId = isHomeowner ? booking.sitter_id : booking.listing.user_id
  const notificationUrl =
    (status === "confirmed" || status === "accepted") && notifyUserId === booking.sitter_id && paymentStatus !== "paid"
      ? `/sits/${bookingId}/payment`
      : `/sits/${bookingId}`

  const reasonSuffix = cancellationReason ? ` Reason: ${cancellationReason}` : ""
  const listingSuffix = listingTitle ? ` for ${listingTitle}` : ""
  const statusTitle = status === "cancelled" ? "Sit cancelled" : `Sit ${status.charAt(0).toUpperCase() + status.slice(1)}`
  const statusBody =
    status === "cancelled"
      ? `${cancellerName} cancelled the sit${listingSuffix}.${reasonSuffix}`
      : `Your sit has been ${status}`

  const notifications = [
    {
      user_id: notifyUserId,
      type: `booking_${status}`,
      title: statusTitle,
      body: statusBody,
      data: { booking_id: bookingId, url: notificationUrl, cancellation_reason: cancellationReason },
    },
  ]

  if (status === "cancelled") {
    notifications.push({
      user_id: user.id,
      type: "booking_cancelled",
      title: "Sit cancelled",
      body: `You cancelled the sit${listingSuffix}.`,
      data: { booking_id: bookingId, url: `/sits/${bookingId}`, cancellation_reason: cancellationReason },
    })
  }

  await adminSupabase.from("notifications").insert(notifications)

  if (status === "cancelled") {
    try {
      await sendBookingCancelledEmail(bookingId)
    } catch (emailError) {
      console.warn("[sitswap] Failed to send cancellation emails:", emailError)
    }
  }

  if (status === "confirmed" || status === "accepted") {
    try {
      await sendBookingConfirmation(bookingId)
    } catch (emailError) {
      console.warn("[sitswap] Failed to send confirmation emails:", emailError)
    }
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath("/bookings")
  revalidatePath(`/sits/${bookingId}`)
  revalidatePath("/sits")
  return { error: null }
}
