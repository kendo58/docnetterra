import { getAllUsers } from "@/lib/admin/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"

type UsersSearchParams = {
  page?: string
  search?: string
  status?: string
  userType?: string
  verificationStatus?: string
}

interface AdminUsersPageProps {
  searchParams: Promise<UsersSearchParams>
}

function normalizeStatusFilter(value?: string): "all" | "active" | "suspended" {
  if (value === "active" || value === "suspended") return value
  return "all"
}

function normalizeUserTypeFilter(value?: string): string {
  if (!value || value === "all") return "all"
  if (value === "homeowner" || value === "sitter" || value === "both") return value
  return "all"
}

function normalizeVerificationFilter(value?: string): string {
  if (!value || value === "all") return "all"
  const allowed = new Set(["unverified", "pending", "basic", "trusted"])
  return allowed.has(value) ? value : "all"
}

function buildPageHref(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams)
  if (page <= 1) {
    params.delete("page")
  } else {
    params.set("page", String(page))
  }

  const query = params.toString()
  return query ? `/admin/users?${query}` : "/admin/users"
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams
  const pageRaw = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const search = params.search?.trim() ?? ""
  const status = normalizeStatusFilter(params.status)
  const userType = normalizeUserTypeFilter(params.userType)
  const verificationStatus = normalizeVerificationFilter(params.verificationStatus)

  const result = await getAllUsers({
    page,
    limit: 20,
    search,
    status,
    userType,
    verificationStatus,
  })

  const { users, total, totalPages } = result
  const from = total === 0 ? 0 : (page - 1) * result.limit + 1
  const to = total === 0 ? 0 : Math.min(page * result.limit, total)
  const baseParams = new URLSearchParams()
  if (search) baseParams.set("search", search)
  if (status !== "all") baseParams.set("status", status)
  if (userType !== "all") baseParams.set("userType", userType)
  if (verificationStatus !== "all") baseParams.set("verificationStatus", verificationStatus)

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4 text-white">User Management</h1>
          <p className="text-slate-400 mt-2">View and manage all registered users</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <form className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    name="search"
                    defaultValue={search}
                    placeholder="Search users by name or email..."
                    className="pl-10 border-slate-600 bg-slate-900 text-white"
                  />
                </div>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  name="status"
                  defaultValue={status}
                  className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select
                  name="userType"
                  defaultValue={userType}
                  className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"
                >
                  <option value="all">All User Types</option>
                  <option value="homeowner">Homeowner</option>
                  <option value="sitter">Sitter</option>
                  <option value="both">Both</option>
                </select>
                <select
                  name="verificationStatus"
                  defaultValue={verificationStatus}
                  className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"
                >
                  <option value="all">All Verification</option>
                  <option value="unverified">Unverified</option>
                  <option value="pending">Pending</option>
                  <option value="basic">Basic</option>
                  <option value="trusted">Trusted</option>
                </select>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Users ({total})</CardTitle>
            <p className="text-sm text-slate-400">
              Showing {from}-{to} of {total}
            </p>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="rounded-lg border border-slate-700 p-8 text-center text-slate-300">
                No users match the selected filters.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-white">{profile.full_name || "No name"}</div>
                        <div className="text-sm text-slate-400">{profile.email}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={profile.is_active ? "default" : "destructive"} className="text-xs">
                            {profile.is_active ? "Active" : "Suspended"}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                            {profile.user_type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-200">
                            {profile.verification_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400 mb-2">
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </div>
                      <Link href={`/users/${profile.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 bg-slate-900 text-white hover:bg-slate-700"
                        >
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Link href={buildPageHref(baseParams, Math.max(1, page - 1))}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      className="border-slate-600 bg-transparent text-slate-300"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                  </Link>
                  <Link href={buildPageHref(baseParams, Math.min(totalPages, page + 1))}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      className="border-slate-600 bg-transparent text-slate-300"
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
