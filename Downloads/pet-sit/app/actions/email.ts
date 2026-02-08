"use server"

import { createServerClient } from "@/lib/supabase/server"
import { enqueueEmailNotification } from "@/lib/jobs/queue"
import { buildEmailContent, type EmailType } from "@/lib/email/templates"

type EmailPayload = Record<string, unknown>

interface SendEmailParams {
  to: string
  type: EmailType
  data: EmailPayload
}

type NotificationPreferences = {
  email_messages?: boolean | null
} & Record<string, unknown>

type ProfileRef = {
  id?: string | null
  email?: string | null
  full_name?: string | null
  notification_preferences?: NotificationPreferences | null
}

type MaybeArray<T> = T | T[] | null

type ListingRef = {
  id?: string | null
  user_id?: string | null
  title?: string | null
  user?: MaybeArray<ProfileRef>
}

type MatchNotificationRow = {
  created_at: string
  listing: MaybeArray<ListingRef>
  sitter: MaybeArray<ProfileRef>
}

type ConversationRef = {
  participant1_id: string | null
  participant2_id: string | null
}

type MessageNotificationRow = {
  sender_id: string
  content: string | null
  created_at: string
  sender: MaybeArray<ProfileRef>
  conversation: MaybeArray<ConversationRef>
}

type BookingNotificationRow = {
  id: string
  start_date: string
  end_date: string
  created_at?: string | null
  updated_at?: string | null
  paid_at?: string | null
  requested_by?: string | null
  sitter_id: string
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  listing: MaybeArray<ListingRef>
  sitter: MaybeArray<ProfileRef>
  canceller?: MaybeArray<ProfileRef>
}

function toOne<T>(value: MaybeArray<T> | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// In a production app, you would integrate with an email service like:
// - Resend (resend.com)
// - SendGrid
// - Postmark
// - AWS SES

export async function sendNotificationEmail({ to, type, data }: SendEmailParams) {
  const content = buildEmailContent(type, data)
  // Queue email work so requests stay fast and retries are automatic.
  // If the jobs table isn't installed yet, fall back to a synchronous no-op.
  try {
    await enqueueEmailNotification({
      to,
      type,
      data,
      subject: content.subject,
      html: content.html,
      previewText: content.previewText,
    })
    console.log(`[Email] Queued ${type} email to ${to}`, { subject: content.subject })
    return { success: true, queued: true }
  } catch (error) {
    console.warn("[Email] Failed to enqueue email job; falling back to no-op log:", error)
    console.log(`[Email] Would send ${type} email to ${to}`, { subject: content.subject })
    return { success: true, queued: false }
  }

  // Example integration with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: "SitSwap <notifications@sitswap.app>",
  //   to,
  //   subject: getSubject(type),
  //   html: getEmailTemplate(type, data),
  // })

  // Note: actual delivery happens in `npm run worker` (email.notification job).
}

export async function sendMatchNotification(matchId: string) {
  const supabase = await createServerClient()

  const { data: match } = await supabase
    .from("matches")
    .select(`
      created_at,
      listing:listings(
        title,
        user:profiles!listings_user_id_fkey(email, full_name)
      ),
      sitter:profiles!matches_sitter_id_fkey(email, full_name)
    `)
    .eq("id", matchId)
    .single<MatchNotificationRow>()

  if (!match) return { success: false }

  const listing = toOne(match.listing)
  const homeowner = toOne(listing?.user)
  const sitter = toOne(match.sitter)

  let delivered = false

  if (homeowner?.email) {
    await sendNotificationEmail({
      to: homeowner.email,
      type: "new_match",
      data: {
        matcherName: sitter?.full_name ?? "Someone",
        listingTitle: listing?.title ?? "your listing",
        eventTime: match.created_at,
      },
    })
    delivered = true
  }

  if (sitter?.email) {
    await sendNotificationEmail({
      to: sitter.email,
      type: "new_match",
      data: {
        matcherName: homeowner?.full_name ?? "Someone",
        listingTitle: listing?.title ?? "your listing",
        eventTime: match.created_at,
      },
    })
    delivered = true
  }

  return { success: delivered }
}

export async function sendMessageNotification(messageId: string) {
  const supabase = await createServerClient()

  const { data: message } = await supabase
    .from("messages")
    .select(`
      sender_id,
      content,
      created_at,
      sender:profiles!messages_sender_id_fkey(full_name),
      conversation:conversations(
        participant1_id,
        participant2_id
      )
    `)
    .eq("id", messageId)
    .single<MessageNotificationRow>()

  if (!message) return { success: false }

  const conversation = toOne(message.conversation)
  if (!conversation?.participant1_id || !conversation.participant2_id) {
    return { success: false }
  }

  const recipientId =
    conversation.participant1_id === message.sender_id ? conversation.participant2_id : conversation.participant1_id

  const { data: recipient } = await supabase
    .from("profiles")
    .select("email, full_name, notification_preferences")
    .eq("id", recipientId)
    .single<ProfileRef>()

  if (!recipient?.email) return { success: false }

  // Check if user has email notifications enabled
  const prefs = recipient.notification_preferences
  if (prefs?.email_messages === false) {
    return { success: true, skipped: true }
  }

  const sender = toOne(message.sender)
  await sendNotificationEmail({
    to: recipient.email,
    type: "new_message",
    data: {
      senderName: sender?.full_name ?? "Someone",
      messagePreview: message.content?.slice(0, 100),
      eventTime: message.created_at,
    },
  })

  return { success: true }
}

export async function sendBookingConfirmation(bookingId: string) {
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id,
      start_date,
      end_date,
      updated_at,
      listing:listings(
        title,
        user:profiles!listings_user_id_fkey(email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(email, full_name)
    `)
    .eq("id", bookingId)
    .single<BookingNotificationRow>()

  if (!booking) return { success: false }

  const listing = toOne(booking.listing)
  const sitter = toOne(booking.sitter)
  const homeowner = toOne(listing?.user)

  if (homeowner?.email) {
    await sendNotificationEmail({
      to: homeowner.email,
      type: "booking_confirmed",
      data: {
        bookingId,
        guestName: sitter?.full_name,
        listingTitle: listing?.title,
        startDate: booking.start_date,
        endDate: booking.end_date,
        eventTime: booking.updated_at,
      },
    })
  }

  if (sitter?.email) {
    await sendNotificationEmail({
      to: sitter.email,
      type: "booking_confirmed",
      data: {
        bookingId,
        hostName: homeowner?.full_name,
        listingTitle: listing?.title,
        startDate: booking.start_date,
        endDate: booking.end_date,
        eventTime: booking.updated_at,
      },
    })
  }

  return { success: true }
}

export async function sendBookingRequestEmail(bookingId: string, options?: { isRebook?: boolean }) {
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      start_date,
      end_date,
      created_at,
      requested_by,
      sitter_id,
      listing:listings(
        id,
        title,
        user_id,
        user:profiles!listings_user_id_fkey(email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(email, full_name)
    `,
    )
    .eq("id", bookingId)
    .single<BookingNotificationRow>()

  if (!booking) return { success: false }

  const listing = toOne(booking.listing)
  const sitter = toOne(booking.sitter)
  const homeowner = toOne(listing?.user)
  const requesterId = booking.requested_by ?? booking.sitter_id
  const isInvite = requesterId === listing?.user_id
  const recipient = isInvite ? sitter : homeowner
  const requesterName = isInvite ? homeowner?.full_name : sitter?.full_name

  if (!recipient?.email) return { success: false }

  const emailType = options?.isRebook ? "booking_rebook_request" : "booking_request"

  await sendNotificationEmail({
    to: recipient.email,
    type: emailType,
    data: {
      bookingId,
      listingTitle: listing?.title,
      requesterName,
      startDate: booking.start_date,
      endDate: booking.end_date,
      eventTime: booking.created_at,
      isInvite,
    },
  })

  return { success: true }
}

export async function sendBookingPaidEmail(bookingId: string) {
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      start_date,
      end_date,
      paid_at,
      updated_at,
      listing:listings(
        id,
        title,
        user:profiles!listings_user_id_fkey(email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(email, full_name)
    `,
    )
    .eq("id", bookingId)
    .single<BookingNotificationRow>()

  if (!booking) return { success: false }

  const listing = toOne(booking.listing)
  const homeowner = toOne(listing?.user)
  const sitter = toOne(booking.sitter)

  if (homeowner?.email) {
    await sendNotificationEmail({
      to: homeowner.email,
      type: "booking_paid",
      data: {
        bookingId,
        listingTitle: listing?.title,
        sitterName: sitter?.full_name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        role: "homeowner",
        eventTime: booking.paid_at ?? booking.updated_at,
      },
    })
  }

  if (sitter?.email) {
    await sendNotificationEmail({
      to: sitter.email,
      type: "booking_paid",
      data: {
        bookingId,
        listingTitle: listing?.title,
        homeownerName: homeowner?.full_name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        role: "sitter",
        eventTime: booking.paid_at ?? booking.updated_at,
      },
    })
  }

  return { success: true }
}

export async function sendBookingCancelledEmail(bookingId: string) {
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      start_date,
      end_date,
      cancelled_by,
      cancelled_at,
      updated_at,
      cancellation_reason,
      sitter_id,
      listing:listings(
        id,
        title,
        user:profiles!listings_user_id_fkey(id, email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(id, email, full_name),
      canceller:profiles!bookings_cancelled_by_fkey(id, full_name)
    `,
    )
    .eq("id", bookingId)
    .single<BookingNotificationRow>()

  if (!booking) return { success: false }

  const listing = toOne(booking.listing)
  const homeowner = toOne(listing?.user)
  const sitter = toOne(booking.sitter)
  const canceller = toOne(booking.canceller)

  const cancellerName =
    canceller?.full_name ||
    (booking.cancelled_by === sitter?.id ? sitter?.full_name : homeowner?.full_name) ||
    "The other party"

  const baseData: EmailPayload = {
    bookingId,
    listingTitle: listing?.title,
    startDate: booking.start_date,
    endDate: booking.end_date,
    cancellationReason: booking.cancellation_reason,
    cancellerName,
    eventTime: booking.cancelled_at ?? booking.updated_at,
  }

  if (homeowner?.email) {
    await sendNotificationEmail({
      to: homeowner.email,
      type: "booking_cancelled",
      data: {
        ...baseData,
        isCanceller: booking.cancelled_by === homeowner.id,
      },
    })
  }

  if (sitter?.email) {
    await sendNotificationEmail({
      to: sitter.email,
      type: "booking_cancelled",
      data: {
        ...baseData,
        isCanceller: booking.cancelled_by === sitter.id,
      },
    })
  }

  return { success: true }
}
