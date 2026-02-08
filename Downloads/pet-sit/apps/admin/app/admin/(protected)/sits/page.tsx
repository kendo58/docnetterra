import Link from "next/link"
import { getAllSits } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Eye } from "lucide-react"

type SitParty = {
  full_name: string | null
  email: string | null
}

type SitListing = {
  title: string | null
  user_id: string | null
}

type AdminSitRow = {
  id: string
  status: string | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  sitter_id: string | null
  listing_id: string | null
  listing: SitListing | null
  homeowner: SitParty | null
  sitter: SitParty | null
}

export default async function AdminSitsPage() {
  const sits = ((await getAllSits()) ?? []) as AdminSitRow[]

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    accepted: "bg-green-500/10 text-green-400 border-green-500/20",
    declined: "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white">Sits</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="h-8 w-8" />
            Sit Management
          </h1>
          <p className="text-slate-400 mt-2">Monitor sit requests, confirmations, and outcomes</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Sits ({sits.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Sit</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Dates</TableHead>
                  <TableHead className="text-slate-400">Listing</TableHead>
                  <TableHead className="text-slate-400">Homeowner</TableHead>
                  <TableHead className="text-slate-400">Sitter</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-10">
                      No sits found
                    </TableCell>
                  </TableRow>
                ) : (
                  sits.map((sit) => {
                    const status = sit.status || "unknown"
                    const listingTitle = sit.listing?.title || sit.listing_id
                    const homeownerLabel = sit.homeowner?.full_name || sit.homeowner?.email || sit.listing?.user_id
                    const sitterLabel = sit.sitter?.full_name || sit.sitter?.email || sit.sitter_id

                    return (
                      <TableRow key={sit.id} className="border-slate-700 hover:bg-slate-750">
                        <TableCell className="text-slate-200">
                          <div className="flex flex-col">
                            <span className="font-medium">Sit #{sit.id.slice(0, 8)}</span>
                            <span className="text-xs text-slate-500 font-mono">{sit.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusColors[status] || "bg-slate-700"} border`}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {sit.start_date ? new Date(sit.start_date).toLocaleDateString() : "—"} –{" "}
                          {sit.end_date ? new Date(sit.end_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-slate-300">{listingTitle}</TableCell>
                        <TableCell className="text-slate-300">{homeownerLabel}</TableCell>
                        <TableCell className="text-slate-300">{sitterLabel}</TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {sit.created_at ? new Date(sit.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/sits/${sit.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-200 bg-transparent hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
