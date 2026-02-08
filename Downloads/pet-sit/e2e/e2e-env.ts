type EnabledAuthEnv = {
  enabled: true
  email: string
  password: string
  anonKey: string
  supabaseUrl: string
  serviceRoleKey: string
}

type DisabledAuthEnv = {
  enabled: false
  missing: string[]
}

export type E2EAuthEnv = EnabledAuthEnv | DisabledAuthEnv

export function getE2EAuthEnv(): E2EAuthEnv {
  const email = process.env.E2E_TEST_EMAIL?.trim()
  const password = process.env.E2E_TEST_PASSWORD

  const supabaseUrl =
    process.env.E2E_SUPABASE_URL ?? process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.E2E_SUPABASE_ANON_KEY ?? process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey =
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []
  if (!email) missing.push("E2E_TEST_EMAIL")
  if (!password) missing.push("E2E_TEST_PASSWORD")
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_TEST_URL / E2E_SUPABASE_URL)")
  if (!anonKey)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_TEST_ANON_KEY / E2E_SUPABASE_ANON_KEY)")
  if (!serviceRoleKey)
    missing.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_TEST_SERVICE_ROLE_KEY / E2E_SUPABASE_SERVICE_ROLE_KEY)")

  if (missing.length > 0) return { enabled: false, missing }

  return {
    enabled: true,
    email: email!,
    password: password!,
    anonKey: anonKey!,
    supabaseUrl: supabaseUrl!,
    serviceRoleKey: serviceRoleKey!,
  }
}
