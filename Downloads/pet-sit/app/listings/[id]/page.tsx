import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PetCard } from "@/components/features/pet-card"
import { ProfileHeader } from "@/components/features/profile-header"
import {
  MapPin,
  Home,
  Bed,
  Bath,
  Heart,
  User,
  Briefcase,
  CheckCircle,
  Star,
  ArrowLeft,
  Share2,
  Flag,
} from "lucide-react"
import { AvailabilityCalendar } from "@/components/features/availability-calendar"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { DeleteListingButton } from "@/components/features/delete-listing-button"
import { ListingContactButton } from "@/components/features/listing-contact-button"
import { InviteToStayButton } from "@/components/features/invite-to-stay-button"
import { isStayListing as isStayListingType } from "@/lib/utils/listing-type"

type ListingPet = Parameters<typeof PetCard>[0]["pet"]
type ListingTask = {
  id: string
  is_required: boolean | null
  task_type: string | null
  description: string | null
  frequency: string | null
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id === "new") {
    redirect("/listings/new")
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch listing with related data
  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      address:addresses(*),
      pets(*),
      tasks(*),
      availability(*),
      user:profiles(*)
    `,
    )
    .eq("id", id)
    .single()

  if (error || !listing) {
    notFound()
  }

  const isStayListing = isStayListingType(listing)

  const isOwner = user?.id === listing.user_id
  const mainPhoto = listing.photos?.[0] || "/modern-home.png"

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BreadcrumbNav items={[{ label: "Listings", href: "/search" }, { label: listing.title }]} />

        <div className="flex items-center justify-between mb-6">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            {!isOwner && (
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
              </Button>
            )}
          </div>
        </div>

        {/* Listing Type Badge */}
        <div className="mb-4">
          <Badge
            variant="secondary"
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide shadow-sm ${
              isStayListing ? "bg-[#6c8fb6] text-white" : "bg-primary text-primary-foreground"
            }`}
          >
            {isStayListing ? (
              <>
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Looking for Stay
              </>
            ) : (
              <>
                <Home className="h-3.5 w-3.5 mr-1" />
                Find a Sitter
              </>
            )}
          </Badge>
        </div>

        {/* Image Gallery */}
        <div className={`mb-8 grid gap-4 ${isStayListing ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg ${isStayListing ? "md:col-span-1" : "md:col-span-2"}`}
          >
            <Image src={mainPhoto || "/placeholder.svg"} alt={listing.title} fill className="object-cover" priority />
          </div>
          {listing.photos?.slice(1, isStayListing ? 3 : 5).map((photo: string, index: number) => (
            <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
              <Image src={photo || "/placeholder.svg"} alt={`Photo ${index + 2}`} fill className="object-cover" />
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Title & Location */}
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">{listing.title}</h1>
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {listing.address?.city}, {listing.address?.state}
                      </span>
                    </div>
                  </div>
                  {!isOwner && (
                    <Button size="icon" variant="outline" className="shrink-0 rounded-full h-12 w-12 bg-transparent">
                      <Heart className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {!isStayListing && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {listing.property_type && (
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <Home className="h-3.5 w-3.5" />
                        <span className="capitalize">{listing.property_type}</span>
                      </Badge>
                    )}
                    {listing.bedrooms && (
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <Bed className="h-3.5 w-3.5" />
                        <span>{listing.bedrooms} bedrooms</span>
                      </Badge>
                    )}
                    {listing.bathrooms && (
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <Bath className="h-3.5 w-3.5" />
                        <span>{listing.bathrooms} bathrooms</span>
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* About Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isStayListing ? (
                    <>
                      <User className="h-5 w-5 text-primary" />
                      About Me
                    </>
                  ) : (
                    <>
                      <Home className="h-5 w-5 text-primary" />
                      About This Home
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{listing.description}</p>
              </CardContent>
            </Card>

            {/* What I Can Offer - Stay Listings */}
            {isStayListing && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    What I Can Offer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Pet Sitting</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#eef3f8] border border-[#d7e3f1]">
                      <CheckCircle className="h-5 w-5 text-[#5a7ca2]" />
                      <span className="font-medium">House Chores</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pets - Only show for sitter listings */}
            {!isStayListing && listing.pets && listing.pets.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Meet the Pets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listing.pets.map((pet: ListingPet) => (
                    <PetCard key={pet.id} pet={pet} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tasks - Only show for sitter listings */}
            {!isStayListing && listing.tasks && listing.tasks.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {listing.tasks.map((task: ListingTask) => (
                      <div key={task.id} className="flex items-start gap-3 rounded-xl border p-4 bg-muted/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={task.is_required ? "default" : "secondary"}>
                              {task.is_required ? "Required" : "Optional"}
                            </Badge>
                            {task.task_type && (
                              <Badge variant="outline" className="capitalize">
                                {task.task_type.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed">{task.description ?? ""}</p>
                          {task.frequency && (
                            <p className="mt-1 text-xs text-muted-foreground">Frequency: {task.frequency}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Amenities - Only show for sitter listings */}
            {!isStayListing && listing.amenities && listing.amenities.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {listing.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm capitalize">{amenity.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* House Rules - Only show for sitter listings */}
            {!isStayListing && listing.house_rules && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>House Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm text-muted-foreground">
                    {listing.house_rules}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg sticky top-24">
              <CardHeader>
                <CardTitle>{isStayListing ? "About the Sitter" : "Hosted by"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileHeader profile={listing.user} />

                {/* User stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>4.9</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Verified</span>
                  </div>
                </div>

                {!isOwner && user && (
                  <div className="mt-6 space-y-3">
                    {isStayListing ? (
                      <>
                        <InviteToStayButton sitterId={listing.user_id} sitterName={listing.user?.full_name} />
                        <ListingContactButton
                          mode="invite"
                          listingId={listing.id}
                          listingTitle={listing.title}
                          recipientId={listing.user_id}
                          recipientName={listing.user?.full_name}
                          ctaLabel="Message"
                          dialogTitle="Message sitter"
                          dialogDescription="Send a quick note to start the conversation."
                        />
                      </>
                    ) : (
                      <ListingContactButton
                        mode="interest"
                        listingId={listing.id}
                        listingTitle={listing.title}
                        recipientId={listing.user_id}
                        recipientName={listing.user?.full_name}
                      />
                    )}
                    <Link href="/swipe">
                      <Button variant="outline" className="w-full bg-transparent">
                        Browse to Match
                      </Button>
                    </Link>
                  </div>
                )}
                {!user && (
                  <div className="mt-6">
                    <Link href="/auth/signup">
                      <Button className="w-full" size="lg">
                        Sign up to connect
                      </Button>
                    </Link>
                  </div>
                )}
                {isOwner && (
                  <div className="mt-6 space-y-3">
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Button variant="outline" className="w-full bg-transparent">
                        Edit Listing
                      </Button>
                    </Link>
                    <DeleteListingButton
                      listingId={listing.id}
                      listingTitle={listing.title}
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      redirectTo="/listings"
                    />
                    <Link href="/listings">
                      <Button variant="ghost" className="w-full">
                        View All My Listings
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Availability */}
            {listing.availability && listing.availability.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isStayListing ? "Available to Help" : "Availability"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AvailabilityCalendar
                    listingId={listing.id}
                    initialAvailability={listing.availability || []}
                    mode="view"
                  />
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/search">
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <MapPin className="h-4 w-4" />
                    Browse Listings
                  </Button>
                </Link>
                <Link href="/matches">
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Heart className="h-4 w-4" />
                    My Matches
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
