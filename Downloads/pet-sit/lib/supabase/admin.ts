import { createClient } from "@supabase/supabase-js"
import { getPublicEnv } from "@/lib/env/public"
import { getServerEnv } from "@/lib/env/server"

// Create a Supabase client with service role key to bypass RLS
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv()
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv()
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing `SUPABASE_SERVICE_ROLE_KEY` (server-only).")

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
