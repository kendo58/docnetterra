import "server-only"
import { getSiteUrl } from "./url"
import { createNotification } from "@/app/actions/notifications"

/**
 * Email Notifications
 * This is a simple implementation that logs to console
 * In production, integrate with Resend or similar email service
 */

interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(data: EmailData) {
  console.log("[sitswap] Email notification:", {
    to: data.to,
    subject: data.subject,
  })

  // TODO: In production, use Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'SitSwap <notifications@sitswap.app>',
  //   to: data.to,
  //   subject: data.subject,
  //   html: data.html,
  // });

  return { success: true }
}

// Notification templates

export async function sendMatchNotification(
  userId: string,
  userEmail: string,
  matchedUserName: string,
  listingTitle: string,
  matchId: string,
) {
  const siteUrl = await getSiteUrl()

  await createNotification(
    userId,
    "match",
    "New Match! 🎉",
    `${matchedUserName} is interested in your listing: ${listingTitle}`,
    { url: `/matches`, matchId },
  )

  // Send email
  return sendEmail({
    to: userEmail,
    subject: "New Match on SitSwap! 🎉",
    html: `
      <h2>You have a new match!</h2>
      <p><strong>${matchedUserName}</strong> is interested in your listing: <strong>${listingTitle}</strong></p>
      <p>Start chatting now to arrange the details!</p>
      <a href="${siteUrl}/matches">View Matches</a>
    `,
  })
}

export async function sendBookingRequestNotification(
  homeownerId: string,
  homeownerEmail: string,
  sitterName: string,
  listingTitle: string,
  dates: string,
  bookingId: string,
) {
  const siteUrl = await getSiteUrl()

  await createNotification(
    homeownerId,
    "booking_request",
    "New Sit Request",
    `${sitterName} requested a sit for ${listingTitle} (${dates})`,
    { url: `/sits/${bookingId}`, bookingId },
  )

  return sendEmail({
    to: homeownerEmail,
    subject: "New Sit Request",
    html: `
      <h2>You have a new sit request!</h2>
      <p><strong>${sitterName}</strong> requested a sit for your listing: <strong>${listingTitle}</strong></p>
      <p>Dates: ${dates}</p>
      <a href="${siteUrl}/sits/${bookingId}">Review Request</a>
    `,
  })
}

export async function sendBookingConfirmationNotification(
  sitterId: string,
  sitterEmail: string,
  homeownerName: string,
  listingTitle: string,
  dates: string,
  bookingId: string,
) {
  const siteUrl = await getSiteUrl()

  await createNotification(
    sitterId,
    "booking_confirmed",
    "Sit Confirmed! ✓",
    `${homeownerName} accepted your sit request for ${listingTitle} (${dates})`,
    { url: `/sits/${bookingId}`, bookingId },
  )

  return sendEmail({
    to: sitterEmail,
    subject: "Sit Confirmed! ✓",
    html: `
      <h2>Your sit is confirmed!</h2>
      <p><strong>${homeownerName}</strong> has accepted your sit request for: <strong>${listingTitle}</strong></p>
      <p>Dates: ${dates}</p>
      <a href="${siteUrl}/sits/${bookingId}">View Sit</a>
    `,
  })
}

export async function sendMessageNotification(
  recipientId: string,
  recipientEmail: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
) {
  const siteUrl = await getSiteUrl()

  await createNotification(recipientId, "message", `New message from ${senderName}`, messagePreview, {
    url: `/messages/${conversationId}`,
    conversationId,
  })

  return sendEmail({
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    html: `
      <h2>You have a new message!</h2>
      <p><strong>${senderName}:</strong> ${messagePreview}</p>
      <a href="${siteUrl}/messages/${conversationId}">Reply Now</a>
    `,
  })
}

export async function sendReviewReminderNotification(
  userId: string,
  userEmail: string,
  otherUserName: string,
  bookingId: string,
) {
  const siteUrl = await getSiteUrl()

  await createNotification(
    userId,
    "review_reminder",
    "Leave a Review",
    `How was your experience with ${otherUserName}? Help the community by leaving a review.`,
    { url: `/reviews/${bookingId}`, bookingId },
  )

  return sendEmail({
    to: userEmail,
    subject: "Leave a Review",
    html: `
      <h2>How was your experience?</h2>
      <p>Your recent stay with <strong>${otherUserName}</strong> has ended. Help the community by leaving a review!</p>
      <a href="${siteUrl}/reviews/${bookingId}">Write Review</a>
    `,
  })
}
