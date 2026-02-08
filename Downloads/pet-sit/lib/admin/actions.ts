"use server"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, requireSuperAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit"
import { log } from "@/lib/observability/logger"

type AdminListingRow = {
  id: string
  user_id: string | null
  address_id: string | null
  title: string | null
  description: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

type AdminOwnerRow = {
  id: string
  full_name: string | null
  email: string | null
  is_active: boolean | null
}

type AdminAddressRow = {
  id: string
  city: string | null
  state: string | null
  country: string | null
}

type AdminSitRow = {
  id: string
  listing_id: string | null
  sitter_id: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  created_at: string | null
}

type AdminSitListingRow = {
  id: string
  title: string | null
  user_id: string | null
}

type AdminProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type AdminUserStatusFilter = "all" | "active" | "suspended"

type GetAllUsersOptions = {
  page?: number
  limit?: number
  search?: string
  status?: AdminUserStatusFilter
  userType?: string
  verificationStatus?: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}

function calculatePercentageDelta(current: number, previous: number) {
  if (current === 0 && previous === 0) return 0
  if (previous === 0) return 100
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function calculateSafetyScore(totalReports: number, openReports: number) {
  if (totalReports <= 0) return 100
  const resolvedReports = Math.max(totalReports - openReports, 0)
  return Number(((resolvedReports / totalReports) * 100).toFixed(1))
}

async function optionalRequireAdmin() {
  await requireAdmin()
}

async function optionalRequireSuperAdmin() {
  await requireSuperAdmin()
}

export async function initializeDatabase() {
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      needsSetup: true,
      error:
        "Admin setup UI is disabled in production. Create your first admin using `npm run admin:create` (or Supabase dashboard tooling).",
      scripts: [],
      steps: ["Admin setup UI is disabled in production."],
    }
  }

  const supabase = await createServerClient()
  const steps: string[] = []

  try {
    steps.push("Checking database status...")

    // Check if core tables exist
    let coreTablesExist = false
    try {
      const { error: tablesError } = await supabase.from("profiles").select("id").limit(1)
      coreTablesExist = !tablesError
    } catch {
      // Table doesn't exist, continue to show setup instructions
      coreTablesExist = false
    }

    if (!coreTablesExist) {
      return {
        success: false,
        needsSetup: true,
        error:
          "Database tables not found. Please run the SQL scripts in the 'scripts' folder using the Supabase SQL Editor.",
        scripts: [
          "001_create_core_schema.sql",
          "002_create_listings_and_pets.sql",
          "003_create_sitter_profiles.sql",
          "004_create_matching_system.sql",
          "005_create_messaging_and_reviews.sql",
          "006_create_admin_tables.sql",
          "022_create_storage_bucket.sql",
          "023_harden_admin_rls.sql",
          "025_add_search_and_geo_infra.sql",
          "026_add_cache_rate_limit_and_jobs.sql",
          "027_add_booking_requester.sql",
          "028_add_booking_payments_and_points.sql",
          "029_update_addresses_policy_for_paid_bookings.sql",
          "030_prevent_self_booking.sql",
          "031_add_booking_overlap_guard.sql",
          "032_add_stripe_webhook_events.sql",
          "033_add_atomic_booking_payment_rpc.sql",
          "034_harden_internal_rpc_permissions.sql",
          "035_backfill_booking_payment_consistency.sql",
          "036_add_hot_path_indexes.sql",
        ],
        steps,
      }
    }

    steps.push("✓ Core tables found")

    // Check if admin tables exist
    let adminTablesExist = false
    try {
      const { error: adminError } = await supabase.from("admin_users").select("id").limit(1)
      adminTablesExist = !adminError
    } catch {
      // Table doesn't exist, continue to show setup instructions
      adminTablesExist = false
    }

    if (!adminTablesExist) {
      return {
        success: false,
        needsSetup: true,
        error: "Admin tables not found. Please run script 006_create_admin_tables.sql in the Supabase SQL Editor.",
        scripts: ["006_create_admin_tables.sql"],
        steps,
      }
    }

    steps.push("✓ Admin tables found")
    steps.push("✓ Database is ready!")

    return {
      success: true,
      needsSetup: false,
      steps,
    }
  } catch (error: unknown) {
    console.error("Database check error:", error)
    return {
      success: false,
      needsSetup: true,
      error: "Failed to check database status: " + errorMessage(error),
      steps,
    }
  }
}

export async function getAdminStats() {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const now = new Date()
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()

  const dayOfWeek = now.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const thisWeekStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday))
  const previousWeekStartDate = new Date(thisWeekStartDate)
  previousWeekStartDate.setUTCDate(previousWeekStartDate.getUTCDate() - 7)
  const nextWeekStartDate = new Date(thisWeekStartDate)
  nextWeekStartDate.setUTCDate(nextWeekStartDate.getUTCDate() + 7)
  const thisWeekStart = thisWeekStartDate.toISOString()
  const previousWeekStart = previousWeekStartDate.toISOString()
  const nextWeekStart = nextWeekStartDate.toISOString()

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: totalBookings },
    { count: pendingReports },
    { count: activeUsers },
    { count: thisMonthUsers },
    { count: previousMonthUsers },
    { count: thisWeekCompletedSits },
    { count: previousWeekCompletedSits },
    { count: totalReports },
    { count: openReports },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("listings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("safety_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisMonthStart)
      .lt("created_at", nextMonthStart),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", previousMonthStart)
      .lt("created_at", thisMonthStart),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", thisWeekStart)
      .lt("created_at", nextWeekStart),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", previousWeekStart)
      .lt("created_at", thisWeekStart),
    supabase.from("safety_reports").select("*", { count: "exact", head: true }),
    supabase.from("safety_reports").select("*", { count: "exact", head: true }).in("status", ["pending", "investigating"]),
  ])

  const thisMonthUsersCount = thisMonthUsers ?? 0
  const previousMonthUsersCount = previousMonthUsers ?? 0
  const thisWeekCompletedSitsCount = thisWeekCompletedSits ?? 0
  const previousWeekCompletedSitsCount = previousWeekCompletedSits ?? 0
  const totalReportsCount = totalReports ?? 0
  const openReportsCount = openReports ?? 0

  return {
    totalUsers: totalUsers || 0,
    totalListings: totalListings || 0,
    totalBookings: totalBookings || 0,
    pendingReports: pendingReports || 0,
    activeUsers: activeUsers || 0,
    userGrowthRatePct: calculatePercentageDelta(thisMonthUsersCount, previousMonthUsersCount),
    sitCompletionRatePct: calculatePercentageDelta(thisWeekCompletedSitsCount, previousWeekCompletedSitsCount),
    safetyScorePct: calculateSafetyScore(totalReportsCount, openReportsCount),
    thisMonthUsers: thisMonthUsersCount,
    previousMonthUsers: previousMonthUsersCount,
    thisWeekCompletedSits: thisWeekCompletedSitsCount,
    previousWeekCompletedSits: previousWeekCompletedSitsCount,
    openSafetyReports: openReportsCount,
    totalSafetyReports: totalReportsCount,
  }
}

export async function getAllUsers(options: GetAllUsersOptions = {}) {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(Math.max(options.limit ?? 20, 10), 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })

  const searchTerm = options.search?.trim()
  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  }

  if (options.status === "active") {
    query = query.eq("is_active", true)
  } else if (options.status === "suspended") {
    query = query.eq("is_active", false)
  }

  if (options.userType && options.userType !== "all") {
    query = query.eq("user_type", options.userType)
  }

  if (options.verificationStatus && options.verificationStatus !== "all") {
    query = query.eq("verification_status", options.verificationStatus)
  }

  const { data: users, error, count } = await query.range(from, to)

  if (error) throw error

  const total = count ?? 0

  return {
    users: users ?? [],
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

export async function getAllListings(page = 1, limit = 50) {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, user_id, address_id, title, description, is_active, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<AdminListingRow[]>()

  if (error) throw error
  if (!listings || listings.length === 0) return []

  const ownerIds = [
    ...new Set(listings.map((listing) => listing.user_id).filter((value): value is string => Boolean(value))),
  ]
  const addressIds = [
    ...new Set(listings.map((listing) => listing.address_id).filter((value): value is string => Boolean(value))),
  ]

  const [{ data: owners }, { data: addresses }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, email, is_active").in("id", ownerIds)
      : Promise.resolve({ data: [] as AdminOwnerRow[] }),
    addressIds.length
      ? supabase.from("addresses").select("id, city, state, country").in("id", addressIds)
      : Promise.resolve({ data: [] as AdminAddressRow[] }),
  ])

  const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner] as const))
  const addressesById = new Map((addresses ?? []).map((address) => [address.id, address] as const))

  return listings.map((listing) => ({
    ...listing,
    owner: listing.user_id ? ownersById.get(listing.user_id) || null : null,
    address: listing.address_id ? addressesById.get(listing.address_id) || null : null,
  }))
}

export async function setListingActive(listingId: string, isActive: boolean) {
  await optionalRequireAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const { error } = await adminSupabase.from("listings").update({ is_active: isActive }).eq("id", listingId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: isActive ? "listing.activated" : "listing.deactivated",
    actionCategory: "listing",
    resourceType: "listing",
    resourceId: listingId,
    description: `${isActive ? "Activated" : "Deactivated"} listing ${listingId}`,
    metadata: { isActive },
    severity: "warning",
  })

  revalidatePath("/admin/listings")
}

export async function getAllSits(page = 1, limit = 50) {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: sits, error } = await supabase
    .from("bookings")
    .select("id, listing_id, sitter_id, start_date, end_date, status, created_at")
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<AdminSitRow[]>()

  if (error) throw error
  if (!sits || sits.length === 0) return []

  const listingIds = [...new Set(sits.map((sit) => sit.listing_id).filter((value): value is string => Boolean(value)))]
  const sitterIds = [...new Set(sits.map((sit) => sit.sitter_id).filter((value): value is string => Boolean(value)))]

  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("id, title, user_id").in("id", listingIds).returns<AdminSitListingRow[]>()
    : { data: [] as AdminSitListingRow[] }

  const homeownerIds = [...new Set((listings ?? []).map((listing) => listing.user_id).filter((value): value is string => Boolean(value)))]
  const profileIds = [...new Set([...sitterIds, ...homeownerIds])]

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds).returns<AdminProfileRow[]>()
    : { data: [] as AdminProfileRow[] }

  const listingsById = new Map((listings ?? []).map((listing) => [listing.id, listing] as const))
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile] as const))

  return sits.map((sit) => {
    const listing = sit.listing_id ? listingsById.get(sit.listing_id) || null : null
    const sitter = sit.sitter_id ? profilesById.get(sit.sitter_id) || null : null
    const homeowner = listing?.user_id ? profilesById.get(listing.user_id) || null : null

    return { ...sit, listing, sitter, homeowner }
  })
}

export async function updateUserVerification(userId: string, status: string, tier: string) {
  await optionalRequireAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const { error } = await adminSupabase
    .from("profiles")
    .update({ verification_status: status, verification_tier: tier })
    .eq("id", userId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "user.verification_updated",
    actionCategory: "admin",
    resourceType: "user",
    resourceId: userId,
    description: `Updated user verification to ${status} (${tier})`,
    metadata: { status, tier },
    severity: "info",
  })

  revalidatePath("/admin/users")
}

export async function suspendUser(userId: string, reason: string) {
  await optionalRequireAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const { error } = await adminSupabase.from("profiles").update({ is_active: false }).eq("id", userId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "user.suspended",
    actionCategory: "admin",
    resourceType: "user",
    resourceId: userId,
    description: `User suspended: ${reason}`,
    metadata: { reason },
    severity: "warning",
  })

  revalidatePath("/admin/users")
}

export async function getAllSafetyReports(status?: string) {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  let query = supabase
    .from("safety_reports")
    .select(`
      *,
      reporter:reporter_id(id, full_name, email),
      reported:reported_user_id(id, full_name, email)
    `)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function updateSafetyReport(reportId: string, status: string, resolutionNotes?: string) {
  await optionalRequireAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const updates: {
    status: string
    resolved_at: string | null
    resolution_notes?: string
  } = {
    status,
    resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
  }

  if (resolutionNotes) {
    updates.resolution_notes = resolutionNotes
  }

  const { error } = await adminSupabase.from("safety_reports").update(updates).eq("id", reportId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: status === "resolved" ? "report.resolved" : "report.dismissed",
    actionCategory: "admin",
    resourceType: "report",
    resourceId: reportId,
    description: `Safety report ${status}${resolutionNotes ? `: ${resolutionNotes}` : ""}`,
    metadata: { status, resolutionNotes },
    severity: "info",
  })

  revalidatePath("/admin/reports")
}

export async function getFlaggedReviews() {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      reviewer:reviewer_id(id, full_name, email),
      reviewee:reviewee_id(id, full_name, email),
      booking:booking_id(id, start_date, end_date)
    `)
    .eq("is_flagged", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function unflagReview(reviewId: string) {
  await optionalRequireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("reviews")
    .update({ is_flagged: false, flagged_reason: null })
    .eq("id", reviewId)

  if (error) throw error
  revalidatePath("/admin/reviews")
}

export async function deleteReview(reviewId: string) {
  await optionalRequireAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const { error } = await adminSupabase.from("reviews").delete().eq("id", reviewId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "admin.action",
    actionCategory: "admin",
    resourceType: "review",
    resourceId: reviewId,
    description: "Review deleted by admin",
    severity: "warning",
  })

  revalidatePath("/admin/reviews")
}

// Admin user management functions
export async function createFirstAdmin(email: string, password: string) {
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error:
        "Admin setup UI is disabled in production. Create admins using `npm run admin:create` (or Supabase dashboard tooling).",
    }
  }

  const adminSupabase = createAdminClient()

  try {
    console.log("[sitswap] Starting admin creation process")

    // Check if any admins already exist
    const { data: existingAdmins, error: checkError } = await adminSupabase.from("admin_users").select("id").limit(1)

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[sitswap] Error checking existing admins:", checkError)
      return { success: false, error: "Failed to check existing admins: " + checkError.message }
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return { success: false, error: "An admin account already exists. Use the admin portal to manage admins." }
    }

    let userId: string
    let userExists = false

    // Try to find existing user by email
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (existingUser) {
      console.log("[sitswap] User already exists with email:", email)
      userId = existingUser.id
      userExists = true
    } else {
      // Create new user
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: "System Administrator",
        },
      })

      if (authError) {
        console.error("[sitswap] Auth error:", authError)
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: "Failed to create user account" }
      }

      userId = authData.user.id
      console.log("[sitswap] New user created with ID:", userId)
    }

    // Wait for profile to exist (created by trigger)
    let profileExists = false
    let attempts = 0
    const maxAttempts = 20

    while (!profileExists && attempts < maxAttempts) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 500))

      const { data: profile } = await adminSupabase.from("profiles").select("id").eq("id", userId).maybeSingle()

      if (profile) {
        profileExists = true
        console.log(`[sitswap] Profile found after ${attempts} attempts`)
      }
    }

    if (!profileExists) {
      console.error("[sitswap] Profile was not created by trigger after", attempts, "attempts")
      return {
        success: false,
        error:
          "Profile creation failed. The database trigger may not be working. Please check that script 001 was run correctly.",
      }
    }

    // Update profile to mark as admin
    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({
        is_admin: true,
        full_name: "System Administrator",
        user_type: "both",
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[sitswap] Profile update error:", updateError)
      // Continue anyway, we can fix this later
    }

    // Create admin_users entry with retry
    let adminInserted = false
    let adminAttempts = 0
    const maxAdminAttempts = 3

    while (!adminInserted && adminAttempts < maxAdminAttempts) {
      adminAttempts++

      const { error: adminError } = await adminSupabase.from("admin_users").insert({
        id: userId,
        role: "super_admin",
        permissions: {
          manage_users: true,
          manage_listings: true,
          manage_reports: true,
          manage_admins: true,
          view_analytics: true,
        },
      })

      if (adminError) {
        console.error(`[sitswap] Admin insert attempt ${adminAttempts} error:`, adminError)
        if (adminAttempts < maxAdminAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } else {
        adminInserted = true
        console.log("[sitswap] Admin user entry created successfully")
      }
    }

    if (!adminInserted) {
      return {
        success: false,
        error:
          "Failed to grant admin permissions. The account was created but admin access was not granted. Please check RLS policies on admin_users table.",
      }
    }

    console.log("[sitswap] Admin account creation completed successfully")

    const message = userExists
      ? "Existing user has been granted admin access! You can now log in at /admin/login with your credentials."
      : "Admin account created successfully! You can now log in at /admin/login with your credentials."

    return {
      success: true,
      message,
    }
  } catch (error: unknown) {
    console.error("[sitswap] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred: " + errorMessage(error) }
  }
}

export async function getAllAdmins() {
  await optionalRequireSuperAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("admin_users")
    .select(`
      *,
      profile:id(id, full_name, email, created_at)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

type AdminRole = "admin" | "super_admin" | "moderator"

function buildAdminPermissions(role: AdminRole) {
  return {
    manage_users: role !== "moderator",
    manage_listings: true,
    manage_reports: true,
    manage_admins: role === "super_admin",
    view_analytics: true,
  }
}

async function findUserByEmail(email: string) {
  const adminSupabase = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail)
    if (match) return match
    if (data.users.length < 200) break
  }

  return null
}

async function ensureNotLastSuperAdmin(userId: string, action: "revoke" | "downgrade") {
  const adminSupabase = createAdminClient()
  const { data: targetAdmin, error: targetError } = await adminSupabase
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle<{ id: string; role: string }>()

  if (targetError) throw targetError
  if (!targetAdmin || targetAdmin.role !== "super_admin") return

  const { count: superAdminCount, error: superAdminCountError } = await adminSupabase
    .from("admin_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")

  if (superAdminCountError) throw superAdminCountError

  if ((superAdminCount ?? 0) <= 1) {
    if (action === "revoke") {
      throw new Error("Cannot revoke access from the last remaining super admin.")
    }
    throw new Error("Cannot downgrade the last remaining super admin.")
  }
}

export async function grantAdminAccess(userId: string, role: AdminRole) {
  await optionalRequireSuperAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const normalizedUserId = userId.trim()
  if (!normalizedUserId) {
    throw new Error("User ID is required")
  }

  const { data: profile, error: profileLookupError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("id", normalizedUserId)
    .maybeSingle<{ id: string }>()

  if (profileLookupError) throw profileLookupError
  if (!profile) {
    throw new Error("User profile not found. Ask the user to sign in once before granting admin access.")
  }

  const permissions = buildAdminPermissions(role)

  // Update profile
  const { error: profileError } = await adminSupabase.from("profiles").update({ is_admin: true }).eq("id", normalizedUserId)

  if (profileError) throw profileError

  // Add/update admin_users idempotently.
  const { error: adminError } = await adminSupabase.from("admin_users").upsert(
    {
      id: normalizedUserId,
      role,
      permissions,
    },
    { onConflict: "id" },
  )

  if (adminError) throw adminError

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "admin.granted",
    actionCategory: "admin",
    resourceType: "user",
    resourceId: userId,
    description: `Granted ${role} access to user`,
    metadata: { role, permissions },
    severity: "critical",
  })

  log("info", "admin.role.granted", {
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    targetUserId: normalizedUserId,
    role,
  })

  revalidatePath("/admin/admins")
  return { success: true }
}

export async function grantAdminAccessByEmail(email: string, role: AdminRole) {
  await optionalRequireSuperAdmin()

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { success: false, error: "Email is required." }
  }

  const user = await findUserByEmail(normalizedEmail)
  if (!user?.id) {
    return { success: false, error: "No account found for that email." }
  }

  await grantAdminAccess(user.id, role)
  return { success: true }
}

export async function revokeAdminAccess(userId: string) {
  await optionalRequireSuperAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  await ensureNotLastSuperAdmin(userId, "revoke")

  // Remove from admin_users
  const { error: adminError } = await adminSupabase.from("admin_users").delete().eq("id", userId)

  if (adminError) throw adminError

  // Update profile
  const { error: profileError } = await adminSupabase.from("profiles").update({ is_admin: false }).eq("id", userId)

  if (profileError) throw profileError

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "admin.revoked",
    actionCategory: "admin",
    resourceType: "user",
    resourceId: userId,
    description: "Revoked admin access from user",
    severity: "critical",
  })

  log("info", "admin.role.revoked", {
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    targetUserId: userId,
  })

  revalidatePath("/admin/admins")
  return { success: true }
}

export async function updateAdminRole(userId: string, role: AdminRole) {
  await optionalRequireSuperAdmin()
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  if (role !== "super_admin") {
    await ensureNotLastSuperAdmin(userId, "downgrade")
  }

  const permissions = buildAdminPermissions(role)

  const { error } = await adminSupabase.from("admin_users").update({ role, permissions }).eq("id", userId)

  if (error) throw error

  await logAuditEvent({
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    actorType: "admin",
    action: "admin.action",
    actionCategory: "admin",
    resourceType: "user",
    resourceId: userId,
    description: `Updated admin role to ${role}`,
    metadata: { role, permissions },
    severity: "critical",
  })

  log("info", "admin.role.updated", {
    actorId: adminUser?.id,
    actorEmail: adminUser?.email,
    targetUserId: userId,
    role,
  })

  revalidatePath("/admin/admins")
  return { success: true }
}
