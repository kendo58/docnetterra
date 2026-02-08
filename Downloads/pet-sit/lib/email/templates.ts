export type EmailType =
  | "new_match"
  | "new_message"
  | "booking_request"
  | "booking_rebook_request"
  | "booking_confirmed"
  | "booking_paid"
  | "booking_cancelled"
  | "booking_completed"
  | "review_received"
  | "verification_complete"
  | "referral_signup"

type EmailContent = {
  subject: string
  previewText: string
  html: string
}

type SummaryRow = {
  label: string
  value: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
const BRAND = {
  name: "SitSwap",
  tagline: "Trusted sits and stays for pets and homes.",
  primary: "#ff385c",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#f6f5f4",
  card: "#ffffff",
  footer: "#9ca3af",
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "\"":
        return "&quot;"
      case "'":
        return "&#39;"
      default:
        return char
    }
  })
}

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback
  return String(value).trim()
}

function formatDate(value?: unknown) {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value)
  if (!normalized) return ""
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return normalized
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function formatDateTime(value?: unknown) {
  const normalized = typeof value === "string" ? value : value == null ? "" : String(value)
  if (!normalized) return ""
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return normalized
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDateRange(start?: unknown, end?: unknown) {
  const startText = formatDate(start)
  const endText = formatDate(end)
  if (startText && endText) return `${startText} - ${endText}`
  return startText || endText || ""
}

function buildUrl(path: string) {
  try {
    return new URL(path, APP_URL).toString()
  } catch {
    return `${APP_URL}${path}`
  }
}

function renderSummary(rows: SummaryRow[]) {
  const safeRows = rows.filter((row) => row.value)
  if (safeRows.length === 0) return ""

  const htmlRows = safeRows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:6px 0;color:${BRAND.text};font-size:14px;text-align:right;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `,
    )
    .join("")

  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0 20px;">
      ${htmlRows}
    </table>
  `
}

function renderEmailLayout(options: {
  title: string
  previewText: string
  intro: string
  summaryRows?: SummaryRow[]
  bodyHtml?: string
  ctaLabel?: string
  ctaUrl?: string
}) {
  const summary = options.summaryRows ? renderSummary(options.summaryRows) : ""
  const cta =
    options.ctaLabel && options.ctaUrl
      ? `
        <div style="margin:24px 0;">
          <a href="${options.ctaUrl}" style="background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:600;">
            ${escapeHtml(options.ctaLabel)}
          </a>
        </div>
        <p style="margin:0;color:${BRAND.muted};font-size:12px;">Or copy this link: ${escapeHtml(options.ctaUrl)}</p>
      `
      : ""

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(options.title)}</title>
      </head>
      <body style="margin:0;background:${BRAND.background};color:${BRAND.text};font-family:Helvetica, Arial, sans-serif;">
        <span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;">
          ${escapeHtml(options.previewText)}
        </span>
        <table role="presentation" width="100%" style="border-collapse:collapse;padding:24px 0;">
          <tr>
            <td align="center" style="padding:24px;">
              <table role="presentation" width="100%" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};background:${BRAND.card};">
                <tr>
                  <td style="background:${BRAND.primary};color:#ffffff;padding:20px 24px;font-size:20px;font-weight:700;">
                    ${BRAND.name}
                    <div style="font-size:12px;font-weight:400;opacity:0.9;">${BRAND.tagline}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${BRAND.text};">
                      ${escapeHtml(options.title)}
                    </h1>
                    <p style="margin:0 0 16px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
                      ${escapeHtml(options.intro)}
                    </p>
                    ${summary}
                    ${options.bodyHtml ?? ""}
                    ${cta}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;border-top:1px solid ${BRAND.border};color:${BRAND.footer};font-size:12px;line-height:1.6;">
                    Manage your notification settings at
                    <a href="${buildUrl("/settings/notifications")}" style="color:${BRAND.primary};text-decoration:none;">${escapeHtml(
                      buildUrl("/settings/notifications"),
                    )}</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function buildEmailContent(type: EmailType, data: Record<string, unknown>): EmailContent {
  const bookingId = safeText(data.bookingId)
  const listingTitleRaw = safeText(data.listingTitle).trim()
  const listingTitle = listingTitleRaw || "your listing"
  const requesterName = safeText(data.requesterName, "Someone")
  const sitterName = safeText(data.sitterName, "The sitter")
  const homeownerName = safeText(data.homeownerName, "The homeowner")
  const matcherName = safeText(data.matcherName, "Someone")
  const senderName = safeText(data.senderName, "Someone")
  const messagePreview = safeText(data.messagePreview)
  const dateRange = formatDateRange(data.startDate, data.endDate)
  const eventTime = formatDateTime(data.eventTime)
  const cancellationReason = safeText(data.cancellationReason)
  const role = safeText(data.role)
  const counterpartName = safeText(data.counterpartName, role === "homeowner" ? sitterName : homeownerName)
  const isInvite = Boolean(data.isInvite)
  const isCanceller = Boolean(data.isCanceller)
  const cancellerName = safeText(data.cancellerName, "The other party")

  switch (type) {
    case "new_match": {
      const title = "You have a new match"
      return {
        subject: `New match with ${matcherName}`,
        previewText: `${matcherName} liked you back on SitSwap.`,
        html: renderEmailLayout({
          title,
          previewText: `${matcherName} liked you back on SitSwap.`,
          intro: `${matcherName} liked you back on SitSwap.`,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Matched at", value: eventTime },
          ],
          ctaLabel: "View matches",
          ctaUrl: buildUrl("/matches"),
        }),
      }
    }
    case "new_message": {
      const title = `New message from ${senderName}`
      const preview = messagePreview || `You received a new message from ${senderName}.`
      return {
        subject: title,
        previewText: preview,
        html: renderEmailLayout({
          title,
          previewText: preview,
          intro: `You have a new message from ${senderName}.`,
          summaryRows: [{ label: "Received at", value: eventTime }],
          bodyHtml: messagePreview
            ? `<div style="margin:16px 0;padding:12px 16px;border:1px solid ${BRAND.border};border-radius:12px;color:${BRAND.text};font-size:14px;line-height:1.6;">${escapeHtml(
                messagePreview,
              )}</div>`
            : undefined,
          ctaLabel: "Reply in SitSwap",
          ctaUrl: buildUrl("/messages"),
        }),
      }
    }
    case "booking_request": {
      const title = isInvite ? "You have a stay invite" : "New sit request"
      const previewText = isInvite
        ? `${requesterName} invited you to stay at ${listingTitle}.`
        : `${requesterName} requested a sit for ${listingTitle}.`
      return {
        subject: isInvite ? `${requesterName} invited you to stay` : `New sit request from ${requesterName}`,
        previewText,
        html: renderEmailLayout({
          title,
          previewText,
          intro: previewText,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Requester", value: requesterName },
            { label: isInvite ? "Invited at" : "Requested at", value: eventTime },
          ],
          ctaLabel: "View request",
          ctaUrl: bookingId ? buildUrl(`/sits/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "booking_rebook_request": {
      const title = isInvite ? "Stay re-invite" : "Rebook request"
      const previewText = isInvite
        ? `${requesterName} re-invited you to stay at ${listingTitle}.`
        : `${requesterName} wants to rebook ${listingTitle}.`
      return {
        subject: isInvite ? `Re-invite to stay from ${requesterName}` : `Rebook request from ${requesterName}`,
        previewText,
        html: renderEmailLayout({
          title,
          previewText,
          intro: previewText,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Requester", value: requesterName },
            { label: isInvite ? "Re-invited at" : "Requested at", value: eventTime },
          ],
          bodyHtml:
            `<p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">` +
            `This is a fresh request after a cancellation. Review the dates and confirm when ready.` +
            `</p>`,
          ctaLabel: "View request",
          ctaUrl: bookingId ? buildUrl(`/sits/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "booking_confirmed": {
      const counterpart = safeText(data.guestName || data.hostName, "The other party")
      const title = "Sit confirmed"
      return {
        subject: `Sit confirmed for ${listingTitle || "your sit"}`,
        previewText: `${counterpart} confirmed the sit for ${listingTitle || "your listing"}.`,
        html: renderEmailLayout({
          title,
          previewText: `${counterpart} confirmed the sit for ${listingTitle || "your listing"}.`,
          intro: `${counterpart} confirmed the sit for ${listingTitle || "your listing"}.`,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Confirmed by", value: counterpart },
            { label: "Confirmed at", value: eventTime },
          ],
          ctaLabel: "View sit",
          ctaUrl: bookingId ? buildUrl(`/sits/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "booking_paid": {
      const title = role === "homeowner" ? "Payment received" : "Payment complete"
      const previewText =
        role === "homeowner"
          ? `${sitterName} paid the service and cleaning fees.`
          : "Your payment is complete and the address is now available."
      const counterpart = role === "homeowner" ? sitterName : homeownerName
      return {
        subject: role === "homeowner" ? `Payment received for ${listingTitle}` : `Payment complete for ${listingTitle}`,
        previewText,
        html: renderEmailLayout({
          title,
          previewText,
          intro: previewText,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Counterpart", value: counterpart },
            { label: "Paid at", value: eventTime },
          ],
          ctaLabel: "View sit",
          ctaUrl: bookingId ? buildUrl(`/sits/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "booking_cancelled": {
      const title = isCanceller ? "You cancelled this sit" : "Sit cancelled"
      const previewText = isCanceller
        ? `You cancelled the sit for ${listingTitle || "your listing"}.`
        : `${cancellerName} cancelled the sit for ${listingTitle || "your listing"}.`
      return {
        subject: isCanceller ? "You cancelled a sit" : `Sit cancelled for ${listingTitle || "your sit"}`,
        previewText,
        html: renderEmailLayout({
          title,
          previewText,
          intro: previewText,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Cancellation reason", value: cancellationReason },
            { label: "Cancelled at", value: eventTime },
          ],
          bodyHtml: `<p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">Fees and points will be refunded.</p>`,
          ctaLabel: "View sit",
          ctaUrl: bookingId ? buildUrl(`/sits/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "booking_completed": {
      const title = "Sit completed"
      const previewText =
        role === "homeowner"
          ? `Your sit for ${listingTitle} is complete. Points are now available.`
          : `Your stay at ${listingTitle} is complete. Thanks for sitting!`
      return {
        subject: `Sit completed for ${listingTitle}`,
        previewText,
        html: renderEmailLayout({
          title,
          previewText,
          intro: previewText,
          summaryRows: [
            { label: "Listing", value: listingTitle },
            { label: "Dates", value: dateRange },
            { label: "Counterpart", value: counterpartName },
            { label: "Completed at", value: eventTime },
          ],
          ctaLabel: "Leave a review",
          ctaUrl: bookingId ? buildUrl(`/reviews/${bookingId}`) : buildUrl("/sits"),
        }),
      }
    }
    case "review_received": {
      const title = "New review received"
      return {
        subject: "You received a new review",
        previewText: "A new review is ready to read.",
        html: renderEmailLayout({
          title,
          previewText: "A new review is ready to read.",
          intro: "A new review is ready in your SitSwap profile.",
          summaryRows: [{ label: "Received at", value: eventTime }],
          ctaLabel: "View reviews",
          ctaUrl: buildUrl("/profile"),
        }),
      }
    }
    case "verification_complete": {
      const title = "Verification complete"
      return {
        subject: "Your verification is complete",
        previewText: "Your identity verification is complete.",
        html: renderEmailLayout({
          title,
          previewText: "Your identity verification is complete.",
          intro: "Your identity verification is complete. You can now access all SitSwap features.",
          summaryRows: [{ label: "Completed at", value: eventTime }],
          ctaLabel: "Go to dashboard",
          ctaUrl: buildUrl("/dashboard"),
        }),
      }
    }
    case "referral_signup": {
      const title = "Referral signup"
      return {
        subject: "Your referral joined SitSwap",
        previewText: "Your referral signed up. Thanks for sharing SitSwap.",
        html: renderEmailLayout({
          title,
          previewText: "Your referral signed up. Thanks for sharing SitSwap.",
          intro: "Your referral signed up. We will notify you when they complete their first sit.",
          summaryRows: [{ label: "Signed up at", value: eventTime }],
          ctaLabel: "View referrals",
          ctaUrl: buildUrl("/dashboard"),
        }),
      }
    }
    default: {
      const title = "SitSwap update"
      return {
        subject: "SitSwap update",
        previewText: "There is an update waiting for you in SitSwap.",
        html: renderEmailLayout({
          title,
          previewText: "There is an update waiting for you in SitSwap.",
          intro: "There is an update waiting for you in SitSwap.",
          ctaLabel: "Open SitSwap",
          ctaUrl: buildUrl("/dashboard"),
        }),
      }
    }
  }
}
