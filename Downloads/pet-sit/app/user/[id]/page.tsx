import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { MapPin, Calendar, Star, Shield, MessageCircle, ArrowLeft, Lock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navigation/navbar"
import { TrustBadges } from "@/components/features/trust-badges"

interface PublicProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // If viewing own profile, redirect to profile page
  if (currentUser?.id === id) {
    redirect("/profile")
  }

  // Fetch the profile being viewed
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      bio,
      profile_photo_url,
      user_type,
      verification_status,
      verification_tier,
      created_at,
      is_active
    `)
    .eq("id", id)
    .single()

  if (error || !profile || !profile.is_active) {
    notFound()
  }

  // Fetch user's address (only city/state, not full address)
  const { data: address } = await supabase
    .from("addresses")
    .select("city, state, country")
    .eq("user_id", id)
    .eq("is_primary", true)
    .single()

  // Fetch reviews about the user
  const { data: reviews } = await supabase.from("reviews").select("*").eq("reviewee_id", id)

  const averageRating =
    reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0

  // Fetch user's active listings (public info only)
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, property_type, photos")
    .eq("user_id", id)
    .eq("is_active", true)
    .limit(3)

  // Check if current user has a confirmed swap with this user
  let hasConfirmedSwap = false
  if (currentUser) {
    const [{ data: currentUserListings }, { data: otherUserListings }] = await Promise.all([
      supabase.from("listings").select("id").eq("user_id", currentUser.id),
      supabase.from("listings").select("id").eq("user_id", id),
    ])

    const myListingIds = currentUserListings?.map((l) => l.id) || []
    const theirListingIds = otherUserListings?.map((l) => l.id) || []

    const conditions: string[] = []

    if (theirListingIds.length > 0) {
      conditions.push(`and(sitter_id.eq.${currentUser.id},listing_id.in.(${theirListingIds.join(",")}))`)
    }

    if (myListingIds.length > 0) {
      conditions.push(`and(sitter_id.eq.${id},listing_id.in.(${myListingIds.join(",")}))`)
    }

    if (conditions.length > 0) {
      const { data: confirmedBooking } = await supabase
        .from("bookings")
        .select("id")
        .in("status", ["confirmed", "accepted"])
        .or(conditions.join(","))
        .limit(1)
        .maybeSingle()

      hasConfirmedSwap = !!confirmedBooking
    }
  }

  // Fetch completed bookings count
  const { count: completedBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("sitter_id", id)
    .eq("status", "completed")

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/explore">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="h-24 w-24 ring-2 ring-primary ring-offset-2 ring-offset-background">
                    <AvatarImage src={profile.profile_photo_url || "/placeholder.svg"} />
                    <AvatarFallback className="text-2xl">{profile.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                        {profile.verification_tier === "premium" && <BadgeIcon type="premium" />}
                        {profile.verification_tier === "enhanced" && <BadgeIcon type="verified" />}
                      </div>

                      {address && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {address.city}, {address.state}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {profile.user_type && (
                        <Badge variant="secondary" className="capitalize">
                          {profile.user_type}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(profile.created_at).getFullYear()}
                      </Badge>
                    </div>

                    {reviews && reviews.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{averageRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({reviews.length} reviews)</span>
                      </div>
                    )}
                  </div>

                  {/* Contact/Message Button */}
                  {currentUser && (
                    <div className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto gap-2" asChild>
                        <Link href={`/messages?userId=${id}`}>
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div className="mt-6 rounded-lg bg-muted p-4">
                    <p className="text-sm leading-relaxed">{profile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust & Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Trust & Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrustBadges
                  verificationTier={profile.verification_tier}
                  reviewCount={reviews?.length || 0}
                  averageRating={averageRating}
                  completedBookings={completedBookings || 0}
                  memberSince={profile.created_at}
                />
              </CardContent>
            </Card>

            {/* Contact Information - Hidden until swap confirmed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasConfirmedSwap ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-800">
                        You have a confirmed swap with this user. Contact details are now visible in your messages.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Lock className="h-5 w-5 text-amber-600" />
                      <span className="text-sm text-amber-800">
                        Contact information is protected until a swap is confirmed through SitSwap.
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-muted-foreground">***@***.***</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-muted-foreground">***-***-****</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Listings */}
            {listings && listings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Listings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((listing) => (
                      <Link key={listing.id} href={`/listings/${listing.id}`}>
                        <div className="rounded-lg border overflow-hidden hover:border-primary transition-colors">
                          <div className="aspect-video relative bg-muted">
                            {listing.photos && (listing.photos as string[])[0] ? (
                              <Image
                                src={(listing.photos as string[])[0] || "/placeholder.svg"}
                                alt={listing.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-medium truncate">{listing.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {listing.property_type === "looking_for_stay"
                                ? "Looking for Stay"
                                : listing.property_type}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reviews ({reviews.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.review_text && <p className="text-sm">{review.review_text}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
