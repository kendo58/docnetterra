import { createClient } from "@supabase/supabase-js"
import { getPublicEnv } from "@/lib/env/public"

export function createWorkerAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!serviceRoleKey) {
    throw new Error("[sitswap] Missing SUPABASE_SERVICE_ROLE_KEY for worker.")
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
