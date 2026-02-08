"use server"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBookingRequestEmail } from "@/app/actions/email"

export async function notifyBookingRequest(
  bookingId: string,
  options?: { isRebook?: boolean; rebookFromId?: string | null },
) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      listing_id,
      sitter_id,
      requested_by,
      listing:listings(id, title, user_id)
    `,
    )
    .eq("id", bookingId)
    .single()

  if (error || !booking) {
    return { error: "Booking not found" }
  }

  const listing = booking.listing as { id?: string; title?: string | null; user_id?: string | null } | null
  const listingOwnerId = listing?.user_id ?? null
  const isParticipant = user.id === booking.sitter_id || user.id === listingOwnerId

  if (!isParticipant) {
    return { error: "Unauthorized" }
  }

  const requesterId = booking.requested_by ?? booking.sitter_id
  const isInvite = requesterId === listingOwnerId
  const isRebook = options?.isRebook === true
  const notifyUserId = isInvite ? booking.sitter_id : listingOwnerId

  if (!notifyUserId) {
    return { error: "Missing notification target" }
  }

  const listingTitle = listing?.title ?? "a listing"
  const notificationTitle = isInvite
    ? isRebook
      ? "Stay Re-Invite"
      : "Stay Invite"
    : isRebook
      ? "Rebook Request"
      : "New Sit Request"
  const notificationBody = isInvite
    ? isRebook
      ? `You've been re-invited to stay at "${listingTitle}"`
      : `You've been invited to stay at "${listingTitle}"`
    : isRebook
      ? `Someone wants to rebook "${listingTitle}"`
      : `Someone requested a sit for "${listingTitle}"`

  const adminSupabase = createAdminClient()
  const { error: notificationError } = await adminSupabase.from("notifications").insert({
    user_id: notifyUserId,
    type: "booking_request",
    title: notificationTitle,
    body: notificationBody,
    data: {
      booking_id: booking.id,
      listing_id: booking.listing_id,
      url: `/sits/${booking.id}`,
      rebook_from: options?.rebookFromId ?? null,
    },
  })

  if (notificationError) {
    return { error: notificationError.message }
  }

  try {
    await sendBookingRequestEmail(booking.id, { isRebook })
  } catch (emailError) {
    console.warn("[sitswap] Failed to send booking request email:", emailError)
  }

  return { error: null }
}
