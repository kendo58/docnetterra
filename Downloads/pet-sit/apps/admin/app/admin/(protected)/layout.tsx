import type React from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/admin"
import { AdminNavbar } from "@/components/admin/admin-navbar"

export const dynamic = "force-dynamic"

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login")

  const adminStatus = await isAdmin(user.id)
  if (!adminStatus) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminNavbar />
      <main className="pt-16">{children}</main>
    </div>
  )
}
