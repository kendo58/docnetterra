import { createServerClient } from "./supabase/server"

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase.from("admin_users").select("id").eq("id", userId).single()

    // If table doesn't exist yet, fall back to checking profiles.is_admin
    if (error?.code === "42P01") {
      console.log("[sitswap] admin_users table not found, checking profiles.is_admin")
      const { data: profileData } = await supabase.from("profiles").select("is_admin").eq("id", userId).single()

      return profileData?.is_admin === true
    }

    return !!data
  } catch (error) {
    console.error("[sitswap] Error checking admin status:", error)
    return false
  }
}

export async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const admin = await isAdmin(user.id)

  if (!admin) {
    throw new Error("Forbidden: Admin access required")
  }

  return user
}

export async function requireSuperAdmin() {
  const user = await requireAdmin()
  const supabase = await createServerClient()

  const { data, error } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle()
  if (error) {
    throw new Error("Forbidden: Super admin access required")
  }

  if (data?.role !== "super_admin") {
    throw new Error("Forbidden: Super admin access required")
  }

  return user
}

export async function makeUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient()

    // Try admin_users table first
    const { error: adminError } = await supabase.from("admin_users").insert({ id: userId })

    if (adminError?.code === "42P01") {
      // If table doesn't exist, update profiles instead
      const { error: profileError } = await supabase.from("profiles").update({ is_admin: true }).eq("id", userId)

      return !profileError
    }

    return !adminError
  } catch (error) {
    console.error("[sitswap] Error making user admin:", error)
    return false
  }
}
