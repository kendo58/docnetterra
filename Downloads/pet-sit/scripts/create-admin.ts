import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

type AdminRole = "admin" | "super_admin" | "moderator"

function getFlagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag)
  if (idx === -1) return null
  const value = argv[idx + 1]
  return value && !value.startsWith("--") ? value : null
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag)
}

function usage(exitCode = 0) {
  const cmd = "npm run admin:create --"
  console.log(
    [
      "Create or grant SitSwap admin access.",
      "",
      `Usage:`,
      `  ${cmd} --email you@example.com --password 'StrongPassword' [--role super_admin]`,
      `  ${cmd} --email you@example.com [--role admin]`,
      "",
      "Options:",
      "  --email            Required. User email.",
      "  --password         Required only when creating a new user.",
      "  --role             admin | super_admin | moderator (default: super_admin)",
      "",
      "Environment:",
      "  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
      "  SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  )
  process.exit(exitCode)
}

async function waitForProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise((r) => setTimeout(r, 500))
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()
    if (data?.id) return true
  }
  return false
}

function buildPermissions(role: AdminRole) {
  return {
    manage_users: role !== "moderator",
    manage_listings: true,
    manage_reports: true,
    manage_admins: role === "super_admin",
    view_analytics: true,
  }
}

async function main() {
  const argv = process.argv.slice(2)

  if (hasFlag(argv, "-h") || hasFlag(argv, "--help")) usage(0)

  const email = getFlagValue(argv, "--email") ?? argv[0] ?? null
  const password = getFlagValue(argv, "--password") ?? argv[1] ?? null
  const roleRaw = (getFlagValue(argv, "--role") ?? "super_admin").toLowerCase()

  const role: AdminRole =
    roleRaw === "admin" || roleRaw === "super_admin" || roleRaw === "moderator" ? (roleRaw as AdminRole) : "super_admin"

  if (!email || !email.includes("@")) {
    console.error("Missing/invalid --email.")
    usage(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Find existing user via profiles (fast and doesn't require listing all auth users).
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin")
    .eq("email", email)
    .maybeSingle()

  if (profileLookupError) {
    console.error("Failed to lookup profile by email:", profileLookupError.message)
    process.exit(1)
  }

  let userId: string
  let createdNewUser = false

  if (existingProfile?.id) {
    userId = existingProfile.id
  } else {
    if (!password || password.trim().length < 8) {
      console.error("User does not exist yet. Provide --password (min 8 characters) to create the first admin user.")
      process.exit(1)
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error("Failed to create auth user:", authError?.message ?? "Unknown error")
      process.exit(1)
    }

    userId = authData.user.id
    createdNewUser = true

    const profileReady = await waitForProfile(supabase, userId)
    if (!profileReady) {
      console.error(
        "Auth user created, but profile row was not created by the signup trigger. Ensure `scripts/001_create_core_schema.sql` was applied.",
      )
      process.exit(1)
    }
  }

  // Mark profile as admin (keep existing profile data intact).
  const { error: profileUpdateError } = await supabase.from("profiles").update({ is_admin: true }).eq("id", userId)
  if (profileUpdateError) {
    console.error("Failed to update profile admin flag:", profileUpdateError.message)
    process.exit(1)
  }

  const permissions = buildPermissions(role)

  const { error: adminUpsertError } = await supabase
    .from("admin_users")
    .upsert(
      {
        id: userId,
        role,
        permissions,
      },
      { onConflict: "id" },
    )

  if (adminUpsertError) {
    console.error("Failed to upsert admin_users entry:", adminUpsertError.message)
    process.exit(1)
  }

  console.log(
    [
      createdNewUser ? "✅ Created user and granted admin access." : "✅ Granted admin access.",
      `Email: ${email}`,
      `Role: ${role}`,
      "",
      "Next:",
      "- Start the app and sign in at `/admin/login`.",
    ].join("\n"),
  )
}

main().catch((error) => {
  console.error("Admin script failed:", error)
  process.exit(1)
})
