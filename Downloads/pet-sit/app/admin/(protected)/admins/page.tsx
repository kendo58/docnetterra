import { getAllAdmins } from "@/lib/admin/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react"
import { AdminUserActions } from "@/components/admin/admin-user-actions"
import { GrantAdminAccess } from "@/components/admin/grant-admin-access"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type AdminProfileSummary = {
  full_name: string | null
  email: string | null
}

type AdminRow = {
  id: string
  role: string
  permissions: Record<string, unknown> | null
  profile: AdminProfileSummary | null
  created_at: string
}

export default async function AdminUsersPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login")

  const { data: adminRow } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle()
  if (adminRow?.role !== "super_admin") redirect("/admin")

  const admins = ((await getAllAdmins()) ?? []) as AdminRow[]

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <ShieldAlert className="w-4 h-4" />
      case "admin":
        return <ShieldCheck className="w-4 h-4" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-red-900 text-red-200">Super Admin</Badge>
      case "admin":
        return <Badge className="bg-orange-900 text-orange-200">Admin</Badge>
      default:
        return <Badge className="bg-slate-700 text-slate-200">Moderator</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Users</h1>
          <p className="text-slate-400">Manage administrator accounts and permissions</p>
        </div>
        <GrantAdminAccess />
      </div>

      <div className="grid gap-4">
        {admins.map((admin) => (
          <Card key={admin.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                    {getRoleIcon(admin.role)}
                  </div>
                  <div>
                    <CardTitle className="text-white">{admin.profile?.full_name || "Unknown"}</CardTitle>
                    <CardDescription className="text-slate-400">{admin.profile?.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(admin.role)}
                  <AdminUserActions adminId={admin.id} currentRole={admin.role} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(admin.permissions ?? {}).map(([key, value]) =>
                    value === true ? (
                      <Badge key={key} variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {key.replace(/_/g, " ")}
                      </Badge>
                    ) : null,
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">Added: {new Date(admin.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
