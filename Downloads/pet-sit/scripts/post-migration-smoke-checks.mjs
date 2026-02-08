import process from "node:process"
import { createClient } from "@supabase/supabase-js"
import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

function getEnv(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function isPostgrestMissingFunction(error) {
  const code = typeof error?.code === "string" ? error.code : ""
  const message = typeof error?.message === "string" ? error.message : ""
  return code === "PGRST202" || message.includes("Could not find the function")
}

const supabaseUrl = getEnv("SUPABASE_URL") ?? getEnv("NEXT_PUBLIC_SUPABASE_URL")
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
const appUrl = getEnv("SITSWAP_APP_HEALTH_URL") ?? getEnv("NEXT_PUBLIC_APP_URL")

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[sitswap] post-migration smoke checks require:")
  console.error("- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL")
  console.error("- SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const checks = []
let failed = 0
let warned = 0

async function runCheck(name, fn) {
  try {
    await fn()
    checks.push(`[PASS] ${name}`)
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    checks.push(`[FAIL] ${name} :: ${message}`)
  }
}

function warn(message) {
  warned += 1
  checks.push(`[WARN] ${message}`)
}

async function assertSelect(table, columns) {
  const { error } = await supabase.from(table).select(columns).limit(1)
  if (error) throw new Error(error.message)
}

async function main() {
  console.log("[sitswap] Running post-migration smoke checks...")

  await runCheck("bookings payment columns available", async () => {
    await assertSelect(
      "bookings",
      "id,payment_status,paid_at,cash_due,service_fee_total,total_fee,points_applied,stripe_payment_intent_id",
    )
  })

  await runCheck("points ledger table available", async () => {
    await assertSelect("points_ledger", "id,user_id,points_delta,reason,created_at")
  })

  await runCheck("webhook dedupe table available", async () => {
    await assertSelect("stripe_webhook_events", "event_id,event_type,processed_at")
  })

  await runCheck("jobs table available", async () => {
    await assertSelect("jobs", "id,task,status,run_at,max_attempts")
  })

  await runCheck("atomic payment rpc (p_cash_paid) is callable", async () => {
    const unknownBookingId = "00000000-0000-4000-8000-000000000001"
    const unknownSitterId = "00000000-0000-4000-8000-000000000002"
    const { error } = await supabase.rpc("pay_booking_with_points", {
      p_booking_id: unknownBookingId,
      p_sitter_id: unknownSitterId,
      p_requested_points: 0,
      p_service_fee_per_night: 50,
      p_cleaning_fee: 200,
      p_service_fee_total: 50,
      p_total_fee: 250,
      p_paid_at: new Date().toISOString(),
      p_cash_paid: 250,
    })
    if (error) throw new Error(error.message)
  })

  await runCheck("rate-limit rpc is callable", async () => {
    const { error } = await supabase.rpc("check_rate_limit", {
      p_key: `smoke:${Date.now()}`,
      p_limit: 5,
      p_window_seconds: 60,
    })
    if (error) throw new Error(error.message)
  })

  await runCheck("legacy payment rpc signature check (optional)", async () => {
    const unknownBookingId = "00000000-0000-4000-8000-000000000003"
    const unknownSitterId = "00000000-0000-4000-8000-000000000004"
    const { error } = await supabase.rpc("pay_booking_with_points", {
      p_booking_id: unknownBookingId,
      p_sitter_id: unknownSitterId,
      p_requested_points: 0,
      p_service_fee_per_night: 50,
      p_cleaning_fee: 200,
      p_service_fee_total: 50,
      p_total_fee: 250,
      p_paid_at: new Date().toISOString(),
    })
    if (!error) return
    if (isPostgrestMissingFunction(error)) {
      warn("legacy pay_booking_with_points signature not present (expected after full rollout)")
      return
    }
    throw new Error(error.message)
  })

  if (appUrl) {
    await runCheck("app health endpoint responds", async () => {
      const response = await fetch(new URL("/api/health", appUrl), { method: "GET" })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const body = await response.json()
      if (body?.status !== "ok" && body?.status !== "degraded") {
        throw new Error(`unexpected status payload: ${JSON.stringify(body)}`)
      }
      if (body?.status === "degraded") {
        warn(`health endpoint degraded: ${(body.issues ?? []).join(", ") || "no issues listed"}`)
      }
    })
  } else {
    warn("skipped app health endpoint check (set NEXT_PUBLIC_APP_URL or SITSWAP_APP_HEALTH_URL)")
  }

  console.log(checks.join("\n"))

  if (failed > 0) {
    console.error(`[sitswap] post-migration smoke checks failed (${failed} failures, ${warned} warnings).`)
    process.exit(1)
  }

  console.log(`[sitswap] post-migration smoke checks passed (${warned} warnings).`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[sitswap] post-migration smoke checks crashed: ${message}`)
  process.exit(1)
})
