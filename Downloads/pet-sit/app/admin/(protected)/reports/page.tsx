import { getAllSafetyReports, updateSafetyReport } from "@/lib/admin/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"

type SafetyReportParty = {
  full_name: string | null
  email: string | null
}

type SafetyReportRow = {
  id: string
  status: string
  report_type: string
  description: string
  created_at: string
  reporter: SafetyReportParty | null
  reported: SafetyReportParty | null
}

async function handleUpdateReport(reportId: string, status: string) {
  "use server"
  await updateSafetyReport(reportId, status)
}

export default async function AdminReportsPage() {
  const reports = ((await getAllSafetyReports()) ?? []) as SafetyReportRow[]

  const statusConfig = {
    pending: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
    investigating: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertTriangle },
    resolved: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
    dismissed: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: XCircle },
  } as const

  const reportTypeColors = {
    harassment: "bg-red-500/10 text-red-400 border-red-500/20",
    fraud: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    property_damage: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    safety_concern: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Safety Reports</h1>
        <p className="text-slate-400 mt-2">Review and manage user-reported safety concerns</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-50">All Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No safety reports yet</p>
              </div>
            ) : (
              reports.map((report) => {
                const StatusIcon = statusConfig[report.status as keyof typeof statusConfig]?.icon || Clock
                const statusColor = statusConfig[report.status as keyof typeof statusConfig]?.color
                const typeColor =
                  reportTypeColors[report.report_type as keyof typeof reportTypeColors] || reportTypeColors.other

                return (
                  <div key={report.id} className="p-6 bg-slate-900/50 border border-slate-700 rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${statusColor} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {report.status}
                          </Badge>
                          <Badge variant="outline" className={`${typeColor} border`}>
                            {report.report_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-300">Reporter:</span>
                            <span className="text-slate-400">
                              {report.reporter?.full_name || report.reporter?.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-300">Reported User:</span>
                            <span className="text-slate-400">
                              {report.reported?.full_name || report.reported?.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium text-slate-300">Description:</span>
                      <p className="mt-2 text-slate-400 bg-slate-900/50 p-3 rounded border border-slate-700">
                        {report.description}
                      </p>
                    </div>

                    {report.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <form action={handleUpdateReport.bind(null, report.id, "investigating")}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Start Investigation
                          </Button>
                        </form>
                        <form action={handleUpdateReport.bind(null, report.id, "dismissed")}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 bg-transparent"
                          >
                            Dismiss
                          </Button>
                        </form>
                      </div>
                    )}

                    {report.status === "investigating" && (
                      <div className="flex gap-2 pt-2">
                        <form action={handleUpdateReport.bind(null, report.id, "resolved")}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Mark Resolved
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
