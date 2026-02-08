import Link from "next/link"
import { getAllListings, setListingActive } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Home, Eye } from "lucide-react"

type ListingOwner = {
  full_name: string | null
  email: string | null
}

type ListingAddress = {
  city: string | null
  state: string | null
}

type AdminListingRow = {
  id: string
  user_id: string
  title: string | null
  is_active: boolean | null
  created_at: string | null
  owner: ListingOwner | null
  address: ListingAddress | null
}

async function handleSetListingActive(listingId: string, isActive: boolean) {
  "use server"
  await setListingActive(listingId, isActive)
}

export default async function AdminListingsPage() {
  const listings = ((await getAllListings()) ?? []) as AdminListingRow[]

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white">Listings</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Home className="h-8 w-8" />
            Listing Management
          </h1>
          <p className="text-slate-400 mt-2">Review and moderate property listings</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Listings ({listings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Listing</TableHead>
                  <TableHead className="text-slate-400">Owner</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-10">
                      No listings found
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map((listing) => {
                    const isActive = listing.is_active === true
                    const ownerLabel = listing.owner?.full_name || listing.owner?.email || listing.user_id
                    const locationLabel =
                      listing.address?.city && listing.address?.state
                        ? `${listing.address.city}, ${listing.address.state}`
                        : null

                    return (
                      <TableRow key={listing.id} className="border-slate-700 hover:bg-slate-750">
                        <TableCell className="text-slate-200">
                          <div className="flex flex-col">
                            <span className="font-medium">{listing.title || "Untitled"}</span>
                            <span className="text-xs text-slate-500 font-mono">{listing.id.slice(0, 8)}</span>
                            {locationLabel && <span className="text-xs text-slate-400">{locationLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{ownerLabel}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isActive
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/listings/${listing.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-200 bg-transparent hover:bg-slate-700"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <form action={handleSetListingActive.bind(null, listing.id, !isActive)}>
                              <Button
                                size="sm"
                                variant={isActive ? "destructive" : "default"}
                                className={isActive ? "" : "bg-green-600 hover:bg-green-700"}
                              >
                                {isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </form>
                          </div>
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
