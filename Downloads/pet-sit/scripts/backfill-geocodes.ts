import { createClient } from "@supabase/supabase-js"
import nextEnv from "@next/env"
import { geocodeLocationServer } from "@/lib/utils/geocoding"

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BATCH_SIZE = Number.parseInt(process.env.GEOCODE_BATCH_SIZE ?? "100", 10)
const DELAY_MS = Number.parseInt(process.env.GEOCODE_DELAY_MS ?? "1000", 10)

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  let totalChecked = 0
  let totalUpdated = 0
  let batch = 0

  while (true) {
    batch += 1
    const { data, error } = await supabase
      .from("addresses")
      .select("id, city, state, latitude, longitude")
      .or("latitude.is.null,longitude.is.null")
      .limit(BATCH_SIZE)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const address of data) {
      totalChecked += 1
      if (!address.city || !address.state) continue

      const result = await geocodeLocationServer(address.city, address.state)
      if (!result.coordinates) {
        await delay(DELAY_MS)
        continue
      }

      const { error: updateError } = await supabase
        .from("addresses")
        .update({
          latitude: result.coordinates.lat,
          longitude: result.coordinates.lng,
        })
        .eq("id", address.id)

      if (updateError) {
        console.error(`Failed to update address ${address.id}:`, updateError.message)
      } else {
        totalUpdated += 1
      }

      await delay(DELAY_MS)
    }

    if (data.length < BATCH_SIZE) break
  }

  console.log(`Checked ${totalChecked} addresses, updated ${totalUpdated}.`)
}

run().catch((error) => {
  console.error("Backfill failed:", error)
  process.exit(1)
})
