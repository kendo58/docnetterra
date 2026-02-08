import { loadEnvConfig } from "@next/env"
import os from "node:os"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"
import nodemailer from "nodemailer"
import { createWorkerAdminClient } from "@/lib/supabase/admin-worker"
import { calculateBookingFees, CLEANING_FEE, SERVICE_FEE_PER_NIGHT } from "@/lib/pricing/fees"
import { buildEmailContent } from "@/lib/email/templates"

loadEnvConfig(process.cwd())

type JobRow = {
  id: string
  task: string
  payload: Record<string, unknown> | null
  status: "queued" | "processing" | "succeeded" | "failed" | "retry"
  run_at: string
  attempts: number
  max_attempts: number
  locked_by: string | null
}

const supabase = createWorkerAdminClient()

function parseBoolean(raw: string | undefined, fallback = false) {
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "<invalid-email>"
  if (local.length <= 2) return `**@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

const workerId = process.env.JOBS_WORKER_ID?.trim() || `${os.hostname()}:${process.pid}`
const pollIntervalMs = Number.parseInt(process.env.JOBS_POLL_INTERVAL_MS ?? "1000", 10) || 1000
const batchSize = Math.min(50, Math.max(1, Number.parseInt(process.env.JOBS_BATCH_SIZE ?? "10", 10) || 10))
const lockTimeoutSeconds = Math.min(3600, Math.max(30, Number.parseInt(process.env.JOBS_LOCK_TIMEOUT_SECONDS ?? "300", 10) || 300))
const housekeepingIntervalMs =
  Math.min(60 * 60 * 1000, Math.max(30 * 1000, Number.parseInt(process.env.JOBS_HOUSEKEEPING_INTERVAL_MS ?? "300000", 10) || 300000))
const bookingAutoCompleteIntervalMs =
  Math.min(24 * 60 * 60 * 1000, Math.max(60 * 1000, Number.parseInt(process.env.JOBS_BOOKING_AUTOCOMPLETE_INTERVAL_MS ?? "900000", 10) || 900000))

const smtpHost = process.env.SMTP_HOST?.trim()
const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "", 10)
const smtpUser = process.env.SMTP_USER?.trim()
const smtpPass = process.env.SMTP_PASS?.trim()
const smtpFrom = process.env.SMTP_FROM?.trim()
const smtpSecure = (() => {
  const raw = process.env.SMTP_SECURE?.trim().toLowerCase()
  if (raw === "true" || raw === "1" || raw === "yes") return true
  if (raw === "false" || raw === "0" || raw === "no") return false
  return smtpPort === 465
})()
const isProduction = process.env.NODE_ENV === "production"
const allowEmailLogFallback = parseBoolean(process.env.ALLOW_EMAIL_LOG_FALLBACK, false)

let smtpTransport: nodemailer.Transporter | null = null

function getSmtpTransport() {
  if (!smtpHost) return null
  if (smtpTransport) return smtpTransport

  smtpTransport = nodemailer.createTransport({
    host: smtpHost,
    port: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  })

  return smtpTransport
}

let stopping = false

process.on("SIGINT", () => {
  stopping = true
})
process.on("SIGTERM", () => {
  stopping = true
})

function backoffSeconds(attempt: number) {
  // Exponential backoff with a sane cap (5s, 10s, 20s, ... up to 10m)
  const base = 5
  const seconds = base * Math.pow(2, Math.max(0, attempt))
  return Math.min(seconds, 600)
}

async function claimJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase.rpc("claim_jobs", {
    p_worker_id: workerId,
    p_max_jobs: batchSize,
    p_lock_timeout_seconds: lockTimeoutSeconds,
  })

  if (error) throw error
  return (data ?? []) as JobRow[]
}

async function runHousekeeping() {
  const cacheMaxRows = 5000
  const rateLimitMaxRows = 5000
  const rateLimitOlderThanSeconds = 60 * 60 * 24

  const [{ data: cacheDeleted, error: cacheError }, { data: rlDeleted, error: rlError }] = await Promise.all([
    supabase.rpc("cache_cleanup", { max_rows: cacheMaxRows }),
    supabase.rpc("rate_limit_cleanup", { max_rows: rateLimitMaxRows, older_than_seconds: rateLimitOlderThanSeconds }),
  ])

  if (cacheError) throw cacheError
  if (rlError) throw rlError

  const cacheCount = typeof cacheDeleted === "number" ? cacheDeleted : 0
  const rlCount = typeof rlDeleted === "number" ? rlDeleted : 0
  if (cacheCount > 0 || rlCount > 0) {
    console.log(`[worker] housekeeping cache_deleted=${cacheCount} rate_limits_deleted=${rlCount}`)
  }
}

async function autoCompleteBookings() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      listing_id,
      sitter_id,
      start_date,
      end_date,
      status,
      payment_status,
      points_awarded,
      service_fee_per_night,
      cleaning_fee,
      insurance_cost,
      listing:listings(
        id,
        title,
        user_id,
        user:profiles!listings_user_id_fkey(email, full_name)
      ),
      sitter:profiles!bookings_sitter_id_fkey(email, full_name)
    `,
    )
    .in("status", ["confirmed", "accepted"])
    .eq("payment_status", "paid")
    .lt("end_date", todayIso)

  if (error) throw error
  if (!bookings || bookings.length === 0) return

  for (const booking of bookings) {
    try {
      const { data: updated, error: updateError } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id)
        .in("status", ["confirmed", "accepted"])
        .eq("payment_status", "paid")
        .select("id")
        .maybeSingle()

      if (updateError) {
        console.warn("[worker] booking auto-complete update failed:", updateError)
        continue
      }

      if (!updated) {
        continue
      }

      const feeSummary = calculateBookingFees({
        startDate: booking.start_date,
        endDate: booking.end_date,
        serviceFeePerNight: Number(booking.service_fee_per_night ?? SERVICE_FEE_PER_NIGHT),
        cleaningFee: Number(booking.cleaning_fee ?? CLEANING_FEE),
        insuranceCost: Number(booking.insurance_cost ?? 0),
      })

      const pointsAwarded = Number(booking.points_awarded ?? 0)
      if (!pointsAwarded && booking.listing?.user_id) {
        const { error: awardError } = await supabase.from("points_ledger").insert({
          user_id: booking.listing.user_id,
          booking_id: booking.id,
          points_delta: feeSummary.nights,
          reason: "booking_completed_points",
        })

        if (awardError) {
          console.warn("[worker] booking auto-complete points failed:", awardError)
        } else {
          await supabase.from("bookings").update({ points_awarded: feeSummary.nights }).eq("id", booking.id)
        }
      }

      const listingTitle = booking.listing?.title ?? "your sit"
      const listingId = booking.listing_id
      const homeownerId = booking.listing?.user_id
      const homeownerProfile = booking.listing?.user
      const sitterProfile = booking.sitter
      const completionTime = new Date().toISOString()
      const sitterId = booking.sitter_id
      const notificationBody = `Your sit for ${listingTitle} is complete.`

      const notifications = [
        homeownerId
          ? {
              user_id: homeownerId,
              type: "booking_completed",
              title: "Sit completed",
              body: notificationBody,
              data: { booking_id: booking.id, listing_id: listingId, url: `/sits/${booking.id}` },
            }
          : null,
        sitterId
          ? {
              user_id: sitterId,
              type: "booking_completed",
              title: "Sit completed",
              body: notificationBody,
              data: { booking_id: booking.id, listing_id: listingId, url: `/sits/${booking.id}` },
            }
          : null,
      ].filter(Boolean)

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications)
      }

      const emailJobs: Array<{
        to: string
        subject: string
        html: string
        previewText: string
        data: Record<string, unknown>
      }> = []

      if (homeownerProfile?.email) {
        const data = {
          bookingId: booking.id,
          listingTitle,
          startDate: booking.start_date,
          endDate: booking.end_date,
          role: "homeowner",
          counterpartName: sitterProfile?.full_name,
          sitterName: sitterProfile?.full_name,
          homeownerName: homeownerProfile?.full_name,
          eventTime: completionTime,
        }
        const content = buildEmailContent("booking_completed", data)
        emailJobs.push({
          to: homeownerProfile.email,
          subject: content.subject,
          html: content.html,
          previewText: content.previewText,
          data,
        })
      }

      if (sitterProfile?.email) {
        const data = {
          bookingId: booking.id,
          listingTitle,
          startDate: booking.start_date,
          endDate: booking.end_date,
          role: "sitter",
          counterpartName: homeownerProfile?.full_name,
          sitterName: sitterProfile?.full_name,
          homeownerName: homeownerProfile?.full_name,
          eventTime: completionTime,
        }
        const content = buildEmailContent("booking_completed", data)
        emailJobs.push({
          to: sitterProfile.email,
          subject: content.subject,
          html: content.html,
          previewText: content.previewText,
          data,
        })
      }

      if (emailJobs.length > 0) {
        const { error: emailError } = await supabase.from("jobs").insert(
          emailJobs.map((job) => ({
            task: "email.notification",
            payload: {
              to: job.to,
              type: "booking_completed",
              data: job.data,
              subject: job.subject,
              html: job.html,
              previewText: job.previewText,
            },
            run_at: completionTime,
            max_attempts: 3,
            status: "queued",
          })),
        )

        if (emailError) {
          console.warn("[worker] booking auto-complete email enqueue failed:", emailError)
        }
      }

      console.log(`[worker] booking.completed id=${booking.id}`)
    } catch (err) {
      console.warn("[worker] booking auto-complete error:", err)
    }
  }
}

async function markSucceeded(jobId: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "succeeded",
      locked_at: null,
      locked_by: null,
      updated_at: now,
    })
    .eq("id", jobId)
    .eq("locked_by", workerId)

  if (error) throw error
}

async function markFailedOrRetry(job: JobRow, err: unknown) {
  const now = new Date()
  const nextAttempts = (job.attempts ?? 0) + 1
  const lastError = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err)

  if (nextAttempts >= (job.max_attempts ?? 5)) {
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "failed",
        attempts: nextAttempts,
        last_error: lastError,
        locked_at: null,
        locked_by: null,
        updated_at: now.toISOString(),
      })
      .eq("id", job.id)
      .eq("locked_by", workerId)

    if (error) throw error
    return
  }

  const runAt = new Date(now.getTime() + backoffSeconds(nextAttempts) * 1000)
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "retry",
      attempts: nextAttempts,
      last_error: lastError,
      run_at: runAt.toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: now.toISOString(),
    })
    .eq("id", job.id)
    .eq("locked_by", workerId)

  if (error) throw error
}

async function handleJob(job: JobRow) {
  switch (job.task) {
    case "email.notification": {
      const { to, type, subject, previewText, html } = job.payload ?? {}
      const transport = getSmtpTransport()
      const finalSubject = subject ?? "SitSwap update"
      const fallbackHtml = previewText ? `<p>${String(previewText)}</p>` : "<p>You have a new update.</p>"
      const recipient = String(to ?? "").trim()

      if (!recipient) {
        throw new Error("email.notification payload missing `to`")
      }

      if (transport && smtpFrom) {
        await transport.sendMail({
          from: smtpFrom,
          to: recipient,
          subject: String(finalSubject),
          html: (html as string) ?? fallbackHtml,
          text: typeof previewText === "string" ? previewText : undefined,
        })
        console.log(`[worker] email.sent → ${maskEmail(recipient)} (${String(type)})`)
        return
      }

      if (isProduction && !allowEmailLogFallback) {
        throw new Error("SMTP is not configured for email.notification in production")
      }

      console.log(`[worker] email.notification (log-fallback) → ${maskEmail(recipient)} (${String(type)})`)
      return
    }
    case "maintenance.cache_cleanup": {
      const maxRows = Number.parseInt(job.payload?.max_rows ?? "1000", 10) || 1000
      const { data, error } = await supabase.rpc("cache_cleanup", { max_rows: maxRows })
      if (error) throw error
      console.log(`[worker] maintenance.cache_cleanup deleted=${data ?? 0}`)
      return
    }
    default:
      throw new Error(`Unknown job task: ${job.task}`)
  }
}

async function main() {
  console.log(`[worker] starting id=${workerId} batch=${batchSize} poll=${pollIntervalMs}ms`)

  let nextHousekeepingAt = Date.now() + housekeepingIntervalMs
  let nextBookingAutoCompleteAt = Date.now() + bookingAutoCompleteIntervalMs

  while (!stopping) {
    if (Date.now() >= nextHousekeepingAt) {
      try {
        await runHousekeeping()
      } catch (error) {
        console.error("[worker] housekeeping failed:", error)
      } finally {
        nextHousekeepingAt = Date.now() + housekeepingIntervalMs
      }
    }

    if (Date.now() >= nextBookingAutoCompleteAt) {
      try {
        await autoCompleteBookings()
      } catch (error) {
        console.error("[worker] booking auto-complete failed:", error)
      } finally {
        nextBookingAutoCompleteAt = Date.now() + bookingAutoCompleteIntervalMs
      }
    }

    let jobs: JobRow[] = []
    try {
      jobs = await claimJobs()
    } catch (error) {
      console.error("[worker] claim_jobs failed:", error)
      await delay(Math.min(5000, pollIntervalMs))
      continue
    }

    if (jobs.length === 0) {
      await delay(pollIntervalMs)
      continue
    }

    for (const job of jobs) {
      if (stopping) break

      try {
        await handleJob(job)
        await markSucceeded(job.id)
      } catch (error) {
        console.error(`[worker] job failed id=${job.id} task=${job.task}:`, error)
        await markFailedOrRetry(job, error)
      }
    }
  }

  console.log("[worker] stopping")
}

main().catch((error) => {
  console.error("[worker] fatal:", error)
  process.exit(1)
})
