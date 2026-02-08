import { getAdminStats } from "@/lib/admin/actions"
import { getAuditStats } from "@/lib/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Home, Calendar, AlertTriangle, TrendingUp, CheckCircle, Activity } from "lucide-react"
import Link from "next/link"

function formatDeltaPercent(value: number) {
  const rounded = Number(value.toFixed(1))
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

function deltaToneClass(value: number) {
  if (value > 0) return "text-green-400"
  if (value < 0) return "text-red-400"
  return "text-slate-300"
}

export default async function AdminDashboard() {
  const [stats, auditStats] = await Promise.all([
    getAdminStats(),
    getAuditStats().catch(() => ({ totalLogs: 0, todayLogs: 0, weekLogs: 0, criticalLogs: 0, warningLogs: 0 })),
  ])

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      href: "/admin/users",
      description: `${stats.activeUsers} active`,
      color: "bg-blue-500",
    },
    {
      title: "Active Listings",
      value: stats.totalListings,
      icon: Home,
      href: "/admin/listings",
      description: "All properties",
      color: "bg-green-500",
    },
    {
      title: "Total Sits",
      value: stats.totalBookings,
      icon: Calendar,
      href: "/admin/sits",
      description: "All time",
      color: "bg-purple-500",
    },
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      icon: AlertTriangle,
      href: "/admin/reports",
      description: "Requires attention",
      color: "bg-red-500",
    },
    {
      title: "Audit Events",
      value: auditStats.todayLogs,
      icon: Activity,
      href: "/admin/audit",
      description: `${auditStats.criticalLogs} critical`,
      color: "bg-orange-500",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Trust & Safety Dashboard</h1>
          <p className="text-slate-400 mt-2">Monitor platform health and manage user safety</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-slate-800 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-300">{stat.title}</CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                    <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Quick Actions & Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">User Management</div>
                  <div className="text-sm text-slate-400">View and manage all users</div>
                </div>
              </Link>

              <Link
                href="/admin/reports"
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="bg-red-600 p-2 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Safety Reports</div>
                  <div className="text-sm text-slate-400">Review reported users and content</div>
                </div>
              </Link>

              <Link
                href="/admin/reviews"
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="bg-yellow-600 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Review Moderation</div>
                  <div className="text-sm text-slate-400">Moderate flagged reviews</div>
                </div>
              </Link>

              <Link
                href="/admin/sits"
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="bg-purple-600 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Sits</div>
                  <div className="text-sm text-slate-400">View all sit activity</div>
                </div>
              </Link>

              <Link
                href="/admin/audit"
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Audit Logs</div>
                  <div className="text-sm text-slate-400">View all platform activity</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5" />
                Platform Health (Live)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-700 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">User Growth</div>
                <div className={`mt-1 text-2xl font-semibold ${deltaToneClass(stats.userGrowthRatePct)}`}>
                  {formatDeltaPercent(stats.userGrowthRatePct)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {stats.thisMonthUsers} this month vs {stats.previousMonthUsers} last month
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Completed Sits Growth</div>
                <div className={`mt-1 text-2xl font-semibold ${deltaToneClass(stats.sitCompletionRatePct)}`}>
                  {formatDeltaPercent(stats.sitCompletionRatePct)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {stats.thisWeekCompletedSits} this week vs {stats.previousWeekCompletedSits} last week
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Safety Resolution Score</div>
                <div className="mt-1 text-2xl font-semibold text-green-400">{stats.safetyScorePct}%</div>
                <div className="mt-1 text-xs text-slate-400">
                  {stats.openSafetyReports} open reports out of {stats.totalSafetyReports} total
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Today’s Activity</span>
                  <span className="font-medium text-white">{auditStats.todayLogs} events</span>
                </div>
                {auditStats.criticalLogs > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {auditStats.criticalLogs} critical events require attention
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400">Last updated: {new Date().toLocaleTimeString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
