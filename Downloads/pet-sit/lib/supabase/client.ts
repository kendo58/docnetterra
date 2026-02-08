import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import { getPublicEnv } from "@/lib/env/public"

export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv()
  return createSupabaseBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export { createClient as createBrowserClient }
