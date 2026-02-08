import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  PlusCircle,
  Search,
  List,
  AlertCircle,
  Home,
  Briefcase,
  ArrowLeft,
  MapPin,
  Dog,
  Cat,
  Edit,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { Badge } from "@/components/ui/badge"
import { DeleteListingButton } from "@/components/features/delete-listing-button"
import { ListingMatches } from "@/components/features/listing-matches"
import { Navbar } from "@/components/navigation/navbar"
import Image from "next/image"
import { isStayListing as isStayListingType } from "@/lib/utils/listing-type"

export const dynamic = "force-dynamic"

type ListingAddress = {
  city: string | null
  state: string | null
}

type ListingPet = {
  id: string
  name: string | null
  species: string | null
}

type RawListing = {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  address_id: string | null
  title: string
  description: string | null
  photos: string[] | null
  is_active: boolean
  listing_type?: string | null
  property_type?: string | null
  [key: string]: unknown
}

type ListingWithRelations = RawListing & {
  addresses: ListingAddress | null
  pets: ListingPet[]
}

export default async function ListingsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch addresses and pets separately to avoid RLS issues with joins
  const enrichedListings: ListingWithRelations[] = []

  if (listings && listings.length > 0) {
    for (const listing of listings as RawListing[]) {
      let address = null
      let pets: ListingPet[] = []

      // Fetch address if address_id exists
      if (listing.address_id) {
        const { data: addressData } = await supabase
          .from("addresses")
          .select("*")
          .eq("id", listing.address_id)
          .maybeSingle()
        address = addressData
      }

      // Fetch pets for this listing
      const { data: petsData } = await supabase.from("pets").select("*").eq("listing_id", listing.id).returns<ListingPet[]>()
      pets = petsData || []

      enrichedListings.push({
        ...listing,
        addresses: address,
        pets: pets,
      })
    }
  }

  // Count listing types
  const stayListings = enrichedListings.filter((l) => isStayListingType(l))
  const sitterListings = enrichedListings.filter((l) => !isStayListingType(l))

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pt-20 pb-24 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <BreadcrumbNav items={[{ label: "My Listings" }]} />

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <List className="h-6 w-6 text-primary" />
                </div>
                My Listings
              </h1>
              <p className="text-muted-foreground mt-2">Manage your pet sitting and stay opportunities</p>
            </div>
            <div className="flex gap-3">
              <Link href="/search">
                <Button variant="outline" className="bg-background">
                  <Search className="mr-2 h-4 w-4" />
                  Browse
                </Button>
              </Link>
              <Link href="/listings/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </div>
          </div>

          {enrichedListings.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm">
                <List className="h-4 w-4" />
                {enrichedListings.length} Total
              </Badge>
              <Badge
                variant="secondary"
                className="gap-2 px-4 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-100"
              >
                <Home className="h-4 w-4" />
                {sitterListings.length} Find a Sitter
              </Badge>
              <Badge
                variant="secondary"
                className="gap-2 px-4 py-2 text-sm bg-[#e3edf7] text-[#33506b] hover:bg-[#e3edf7]"
              >
                <Briefcase className="h-4 w-4" />
                {stayListings.length} Looking for Stay
              </Badge>
            </div>
          )}

          {listingsError && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Error loading listings. Please try refreshing the page.</p>
            </div>
          )}

          {enrichedListings.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <PlusCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Create your first listing to start connecting with pet sitters or find your next stay
                </p>
                <Link href="/listings/new">
                  <Button size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Your First Listing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {enrichedListings.map((listing) => {
                const isStayListing = isStayListingType(listing)
                const hasPets = Boolean(listing.pets && listing.pets.length > 0)
                const mainPhoto = listing.photos?.[0] || "/modern-home.png"
                const listingForMatches = {
                  ...listing,
                  address_id: listing.address_id ?? undefined,
                }

                return (
                  <Card
                    key={listing.id}
                    className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail - much smaller */}
                      <div className="relative w-full sm:w-48 h-40 sm:h-auto sm:min-h-[160px] flex-shrink-0">
                        <Image
                          src={mainPhoto || "/placeholder.svg"}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                        <Badge
                          className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm ${
                            isStayListing ? "bg-[#6c8fb6] text-white" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {isStayListing ? "Stay" : "Sitter"}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>
                                  {listing.addresses?.city}, {listing.addresses?.state}
                                </span>
                              </div>
                            </div>
                            <Badge variant={listing.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                              {listing.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>

                          {/* Quick info */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {hasPets &&
                              listing.pets.slice(0, 3).map((pet) => (
                                <Badge key={pet.id} variant="outline" className="gap-1 text-xs">
                                  {pet.species === "dog" ? <Dog className="h-3 w-3" /> : <Cat className="h-3 w-3" />}
                                  {pet.name}
                                </Badge>
                              ))}
                            {listing.pets && listing.pets.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{listing.pets.length - 3} more
                              </Badge>
                            )}
                            {isStayListing && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                Offering services for stay
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Link href={`/listings/${listing.id}`} className="flex-1 sm:flex-none">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 bg-transparent">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/listings/${listing.id}/edit`} className="flex-1 sm:flex-none">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 bg-transparent">
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </Link>
                          <DeleteListingButton
                            listingId={listing.id}
                            listingTitle={listing.title}
                            variant="outline"
                            size="sm"
                            redirectTo="/listings"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t bg-muted/30 px-4 py-3">
                      <ListingMatches listing={listingForMatches} userId={user.id} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Quick actions footer */}
          {enrichedListings.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Link href="/listings/new">
                <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                  <PlusCircle className="h-5 w-5" />
                  Create Another Listing
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
