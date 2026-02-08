import { getAuditLogs, getAuditStats, type AuditCategory, type AuditSeverity } from "@/lib/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface AuditPageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    severity?: string
    search?: string
  }>
}

type AuditLogRow = {
  id: string
  created_at: string
  severity: string
  action_category: string
  action: string
  actor_email: string | null
  actor_type: string | null
  description: string
}

const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  "auth",
  "listing",
  "booking",
  "message",
  "matching",
  "admin",
  "payment",
  "report",
]

const AUDIT_SEVERITIES: readonly AuditSeverity[] = ["info", "warning", "critical"]

function parseAuditCategory(value?: string): AuditCategory | undefined {
  if (!value || value === "all") return undefined
  return AUDIT_CATEGORIES.includes(value as AuditCategory) ? (value as AuditCategory) : undefined
}

function parseAuditSeverity(value?: string): AuditSeverity | undefined {
  if (!value || value === "all") return undefined
  return AUDIT_SEVERITIES.includes(value as AuditSeverity) ? (value as AuditSeverity) : undefined
}

export default async function AuditLogsPage({ searchParams }: AuditPageProps) {
  const params = await searchParams
  const page = Number.parseInt(params.page || "1")
  const category = parseAuditCategory(params.category)
  const severity = parseAuditSeverity(params.severity)
  const search = params.search

  const [auditData, stats] = await Promise.all([
    getAuditLogs({
      page,
      limit: 25,
      category,
      severity,
      search,
    }),
    getAuditStats(),
  ])

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>
      default:
        return <Badge variant="secondary">Info</Badge>
    }
  }

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      auth: "bg-purple-500",
      listing: "bg-green-500",
      booking: "bg-blue-500",
      message: "bg-cyan-500",
      matching: "bg-pink-500",
      admin: "bg-red-500",
      payment: "bg-orange-500",
      report: "bg-yellow-500",
    }
    const label = cat === "booking" ? "sit" : cat
    return <Badge className={`${colors[cat] || "bg-gray-500"} hover:${colors[cat] || "bg-gray-600"}`}>{label}</Badge>
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white">Audit Logs</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Activity className="h-8 w-8" />
                Audit Logs
              </h1>
              <p className="text-slate-400 mt-2">Track all platform activities and changes</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-600 text-slate-300 bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Link href="/admin/audit">
                <Button variant="outline" className="border-slate-600 text-slate-300 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{stats.totalLogs}</div>
              <div className="text-sm text-slate-400">Total Events</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{stats.todayLogs}</div>
              <div className="text-sm text-slate-400">Today</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{stats.weekLogs}</div>
              <div className="text-sm text-slate-400">This Week</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">{stats.criticalLogs}</div>
              <div className="text-sm text-slate-400">Critical</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.warningLogs}</div>
              <div className="text-sm text-slate-400">Warnings</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <form className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <Input
                  name="search"
                  placeholder="Search logs..."
                  defaultValue={search}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Select name="category" defaultValue={category || "all"}>
                <SelectTrigger className="w-[150px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="listing">Listing</SelectItem>
                  <SelectItem value="booking">Sits</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                </SelectContent>
              </Select>
              <Select name="severity" defaultValue={severity || "all"}>
                <SelectTrigger className="w-[150px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Activity Log ({auditData.total} events)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Severity</TableHead>
                  <TableHead className="text-slate-400">Time</TableHead>
                  <TableHead className="text-slate-400">Category</TableHead>
                  <TableHead className="text-slate-400">Action</TableHead>
                  <TableHead className="text-slate-400">Actor</TableHead>
                  <TableHead className="text-slate-400">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      No audit logs found. Run the migration script to enable audit logging.
                    </TableCell>
                  </TableRow>
                ) : (
                  (auditData.logs as AuditLogRow[]).map((log) => (
                    <TableRow key={log.id} className="border-slate-700 hover:bg-slate-750">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(log.severity)}
                          {getSeverityBadge(log.severity)}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>{getCategoryBadge(log.action_category)}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">{log.action}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex flex-col">
                          <span className="text-sm">{log.actor_email || "System"}</span>
                          <span className="text-xs text-slate-500">{log.actor_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-md truncate">{log.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {auditData.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400">
                  Page {auditData.page} of {auditData.totalPages}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/audit?page=${Math.max(1, page - 1)}${category ? `&category=${category}` : ""}${severity ? `&severity=${severity}` : ""}${search ? `&search=${search}` : ""}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      className="border-slate-600 text-slate-300 bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  </Link>
                  <Link
                    href={`/admin/audit?page=${Math.min(auditData.totalPages, page + 1)}${category ? `&category=${category}` : ""}${severity ? `&severity=${severity}` : ""}${search ? `&search=${search}` : ""}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= auditData.totalPages}
                      className="border-slate-600 text-slate-300"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
