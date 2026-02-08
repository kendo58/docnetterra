import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

type CacheRow = {
  key: string
  value: unknown
  expires_at: string
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.warn("[sitswap] Cache unavailable; treating as miss:", error)
    return null
  }
  const { data, error } = await supabase
    .from("cache_entries")
    .select("key,value,expires_at")
    .eq("key", key)
    .maybeSingle<CacheRow>()

  if (error) {
    // If the SQL script hasn't been applied yet, disable caching instead of breaking the app.
    if (error.code === "42P01") return null
    throw error
  }
  if (!data) return null

  const expiresAt = new Date(data.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    // Best-effort cleanup; don't block the request on deletion.
    void supabase.from("cache_entries").delete().eq("key", key)
    return null
  }

  return data.value as T
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.warn("[sitswap] Cache unavailable; skipping set:", error)
    return
  }
  const expiresAt = new Date(Date.now() + Math.max(1, ttlSeconds) * 1000).toISOString()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("cache_entries")
    .upsert({ key, value, expires_at: expiresAt, updated_at: now }, { onConflict: "key" })

  if (error) {
    if (error.code === "42P01") return
    throw error
  }
}

export async function cacheDelete(key: string): Promise<void> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.warn("[sitswap] Cache unavailable; skipping delete:", error)
    return
  }
  const { error } = await supabase.from("cache_entries").delete().eq("key", key)
  if (error) {
    if (error.code === "42P01") return
    throw error
  }
}
