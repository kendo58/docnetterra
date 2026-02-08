import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import fs from "node:fs/promises"
import path from "node:path"
import { getE2EAuthEnv } from "./e2e-env"

const FIXTURE_PATH = path.join(process.cwd(), "e2e", ".fixtures.json")

async function findUserByEmail(adminClient: SupabaseClient, email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase()

  for (let page = 1; page <= 5; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail)
    if (match) return match as User

    if (data.users.length < 200) break
  }

  return null
}

async function ensureUser(adminClient: SupabaseClient, options: { email: string; password: string; fullName: string }) {
  const email = options.email.toLowerCase()
  const existing = await findUserByEmail(adminClient, email)
  if (existing) {
    const { error } = await adminClient.auth.admin.updateUserById(existing.id, {
      password: options.password,
      email_confirm: true,
      user_metadata: { full_name: options.fullName },
    })
    if (error) throw error
    return existing
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: options.password,
    email_confirm: true,
    user_metadata: { full_name: options.fullName },
  })
  if (error) throw error

  const user = (data.user ?? null) as User | null
  if (!user) throw new Error(`[e2e] Could not create user for ${email}`)
  return user
}

async function ensureProfile(adminClient: SupabaseClient, options: { id: string; email: string; fullName: string }) {
  const { error } = await adminClient.from("profiles").upsert(
    {
      id: options.id,
      email: options.email.toLowerCase(),
      full_name: options.fullName,
      user_type: "both",
      onboarding_completed: true,
      is_active: true,
    },
    { onConflict: "id" },
  )

  if (error) {
    console.warn(`[e2e] Could not upsert profile for ${options.email} (continuing): ${error.message}`)
  }
}

async function removeFixtureFile() {
  try {
    await fs.unlink(FIXTURE_PATH)
  } catch {
    // File may not exist yet; ignore.
  }
}

async function cleanupOldBookingFixtures(adminClient: SupabaseClient, homeownerId: string) {
  const { data: listings, error: listingsError } = await adminClient
    .from("listings")
    .select("id,address_id,title,user_id")
    .eq("user_id", homeownerId)
    .ilike("title", "E2E Fixture Listing %")

  if (listingsError) {
    throw new Error(`[e2e] Failed to list old fixtures: ${listingsError.message}`)
  }

  if (!listings || listings.length === 0) return

  for (const listing of listings) {
    const listingId = String(listing.id)
    const addressId = listing.address_id ? String(listing.address_id) : null

    await adminClient.from("bookings").delete().eq("listing_id", listingId)
    await adminClient.from("availability").delete().eq("listing_id", listingId)
    await adminClient.from("conversations").delete().eq("listing_id", listingId)
    await adminClient.from("matches").delete().eq("listing_id", listingId)
    await adminClient.from("pets").delete().eq("listing_id", listingId)
    await adminClient.from("tasks").delete().eq("listing_id", listingId)
    await adminClient.from("listings").delete().eq("id", listingId)

    if (addressId) {
      const { data: addressInUse, error: addressCheckError } = await adminClient
        .from("listings")
        .select("id")
        .eq("address_id", addressId)
        .limit(1)
        .maybeSingle()

      if (addressCheckError) {
        throw new Error(`[e2e] Failed to verify fixture address usage: ${addressCheckError.message}`)
      }

      if (!addressInUse) {
        await adminClient.from("addresses").delete().eq("id", addressId)
      }
    }
  }
}

function toDateString(dayOffset: number) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString().slice(0, 10)
}

async function createBookingFixtures(adminClient: SupabaseClient, options: { sitterId: string; homeownerId: string }) {
  const fixtureTag = `e2e-${Date.now()}`
  const paymentStart = toDateString(14)
  const paymentEnd = toDateString(16)
  const cancellationStart = toDateString(22)
  const cancellationEnd = toDateString(24)

  const { data: address, error: addressError } = await adminClient
    .from("addresses")
    .insert({
      user_id: options.homeownerId,
      street_address: "100 E2E Lane",
      city: "Austin",
      state: "TX",
      postal_code: "78701",
      country: "US",
      latitude: 30.2672,
      longitude: -97.7431,
      is_primary: false,
    })
    .select("id")
    .single()

  if (addressError || !address) {
    throw new Error(`[e2e] Failed to create fixture address: ${addressError?.message ?? "unknown error"}`)
  }

  const { data: listing, error: listingError } = await adminClient
    .from("listings")
    .insert({
      user_id: options.homeownerId,
      address_id: address.id,
      title: `E2E Fixture Listing ${fixtureTag}`,
      description: "Fixture listing for booking payment/cancellation E2E coverage.",
      listing_type: "pet_sitting",
      property_type: "house",
      is_active: true,
    })
    .select("id")
    .single()

  if (listingError || !listing) {
    throw new Error(`[e2e] Failed to create fixture listing: ${listingError?.message ?? "unknown error"}`)
  }

  await adminClient.from("availability").insert([
    { listing_id: listing.id, start_date: paymentStart, end_date: paymentEnd, is_booked: true },
    { listing_id: listing.id, start_date: cancellationStart, end_date: cancellationEnd, is_booked: true },
  ])

  const serviceFeePerNight = 50
  const cleaningFee = 200
  const serviceFeeTotal = 2 * serviceFeePerNight
  const totalFee = serviceFeeTotal + cleaningFee

  const { data: paymentBooking, error: paymentBookingError } = await adminClient
    .from("bookings")
    .insert({
      listing_id: listing.id,
      sitter_id: options.sitterId,
      requested_by: options.sitterId,
      start_date: paymentStart,
      end_date: paymentEnd,
      status: "confirmed",
      insurance_selected: false,
      insurance_plan_type: null,
      insurance_cost: 0,
      service_fee_per_night: serviceFeePerNight,
      cleaning_fee: cleaningFee,
      service_fee_total: serviceFeeTotal,
      total_fee: totalFee,
      points_applied: 0,
      cash_due: totalFee,
      payment_status: "unpaid",
    })
    .select("id")
    .single()

  if (paymentBookingError || !paymentBooking) {
    throw new Error(`[e2e] Failed to create payment fixture booking: ${paymentBookingError?.message ?? "unknown error"}`)
  }

  const { data: cancellationBooking, error: cancellationBookingError } = await adminClient
    .from("bookings")
    .insert({
      listing_id: listing.id,
      sitter_id: options.sitterId,
      requested_by: options.sitterId,
      start_date: cancellationStart,
      end_date: cancellationEnd,
      status: "accepted",
      insurance_selected: false,
      insurance_plan_type: null,
      insurance_cost: 0,
      service_fee_per_night: serviceFeePerNight,
      cleaning_fee: cleaningFee,
      service_fee_total: serviceFeeTotal,
      total_fee: totalFee,
      points_applied: 0,
      cash_due: totalFee,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: "stripe",
    })
    .select("id")
    .single()

  if (cancellationBookingError || !cancellationBooking) {
    throw new Error(
      `[e2e] Failed to create cancellation fixture booking: ${cancellationBookingError?.message ?? "unknown error"}`,
    )
  }

  return {
    paymentBookingId: paymentBooking.id,
    cancellationBookingId: cancellationBooking.id,
    generatedAt: new Date().toISOString(),
  }
}

export default async function globalSetup() {
  const env = getE2EAuthEnv()
  if (!env.enabled) {
    await removeFixtureFile()
    console.log(`[e2e] Auth tests disabled (missing: ${env.missing.join(", ")})`)
    return
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const email = env.email.toLowerCase()
  const sitterUser = await ensureUser(adminClient, {
    email,
    password: env.password,
    fullName: "E2E Test User",
  })
  await ensureProfile(adminClient, {
    id: sitterUser.id,
    email,
    fullName: "E2E Test User",
  })

  const homeownerEmail = (process.env.E2E_HOMEOWNER_EMAIL ?? "e2e-homeowner@example.com").toLowerCase()
  const homeownerPassword = process.env.E2E_HOMEOWNER_PASSWORD ?? env.password
  const homeownerUser = await ensureUser(adminClient, {
    email: homeownerEmail,
    password: homeownerPassword,
    fullName: "E2E Homeowner",
  })
  await ensureProfile(adminClient, {
    id: homeownerUser.id,
    email: homeownerEmail,
    fullName: "E2E Homeowner",
  })

  await cleanupOldBookingFixtures(adminClient, homeownerUser.id)

  const fixtures = await createBookingFixtures(adminClient, {
    sitterId: sitterUser.id,
    homeownerId: homeownerUser.id,
  })

  await fs.writeFile(FIXTURE_PATH, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8")

  console.log(`[e2e] Auth user ready: ${email}`)
  console.log(
    `[e2e] Booking fixtures ready: payment=${fixtures.paymentBookingId}, cancellation=${fixtures.cancellationBookingId}`,
  )
}
