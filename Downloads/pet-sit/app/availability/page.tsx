import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AvailabilityCalendar } from "@/components/features/availability-calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarDays, Plus, ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"

type ListingAddress = {
  city: string | null
  state: string | null
}

type ListingRow = {
  id: string
  title: string
  address: ListingAddress | ListingAddress[] | null
}

type ListingWithAvailability = {
  id: string
  title: string
  address: ListingAddress
  availability: AvailabilityRow[]
}

type AvailabilityRow = {
  id: string
  start_date: string
  end_date: string
  is_booked: boolean
}

export default async function AvailabilityPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's listings
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, address:addresses!inner(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .returns<ListingRow[]>()

  if (!listings || listings.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pb-24 pt-20 md:pb-8">
          <div className="container max-w-4xl py-8 px-4">
            <div className="mb-6">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <Card>
              <CardHeader className="text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>No Listings Yet</CardTitle>
                <CardDescription>Create a listing first to manage your availability</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Link href="/listings/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Listing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  // Get availability for all listings
  const listingsWithAvailability = await Promise.all(
    listings.map(async (listing): Promise<ListingWithAvailability> => {
      const { data: availability } = await supabase
        .from("availability")
        .select("id, start_date, end_date, is_booked")
        .eq("listing_id", listing.id)
        .order("start_date", { ascending: true })
        .returns<AvailabilityRow[]>()

      const address = Array.isArray(listing.address) ? listing.address[0] : listing.address

      return {
        ...listing,
        address: address ?? { city: null, state: null },
        availability: availability ?? [],
      }
    }),
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="container max-w-6xl py-8 px-4">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="ghost" size="sm">
                My Listings
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Manage Availability</h1>
            <p className="mt-2 text-muted-foreground">
              Set when you're available for pet sitting across all your listings
            </p>
          </div>

          <div className="space-y-8">
            {listingsWithAvailability.map((listing) => (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{listing.title}</CardTitle>
                      <CardDescription>
                        {listing.address.city}, {listing.address.state}
                      </CardDescription>
                    </div>
                    <Link href={`/listings/${listing.id}`}>
                      <Button variant="outline" size="sm">
                        View Listing
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <AvailabilityCalendar listingId={listing.id} initialAvailability={listing.availability} mode="edit" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
