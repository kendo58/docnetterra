import { notFound, redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewCard } from "@/components/features/review-card"
import { Star, MapPin, Calendar, Shield, MessageCircle, Home } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navigation/navbar"

type ProfileRow = {
  id: string
  full_name: string | null
  profile_photo_url: string | null
  verification_tier: string | null
  user_type: string | null
  created_at: string
  bio: string | null
}

type UserListingRow = {
  id: string
  title: string
  description: string | null
  address: {
    city: string | null
    state: string | null
  } | null
  pets: Array<{ id: string }>
}

type UserReviewRow = {
  id: string
  rating: number
  created_at: string
  review_text: string | null
  would_recommend: boolean | null
  accuracy_rating: number | null
  communication_rating: number | null
  cleanliness_rating: number | null
  responsibility_rating: number | null
  reviewer: {
    full_name: string | null
    profile_photo_url: string | null
    verification_tier: string | null
  } | null
}

type DisplayReview = Parameters<typeof ReviewCard>[0]["review"]

async function getUserProfile(userId: string) {
  const supabase = await createServerClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) redirect("/auth/login")

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single<ProfileRow>()

  if (!profile) return null

  // Fetch user's listings
  const { data: listings } = await supabase
    .from("listings")
    .select(`*, pets(*), address:addresses(*)`)
    .eq("user_id", userId)
    .eq("is_active", true)
    .returns<UserListingRow[]>()

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      `
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(
        full_name,
        profile_photo_url,
        verification_tier
      )
    `,
    )
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserReviewRow[]>()

  const averageRating =
    reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0

  return { profile, listings: listings || [], reviews: reviews || [], averageRating, currentUserId: currentUser.id }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getUserProfile(id)

  if (!data) {
    notFound()
  }

  const { profile, listings, reviews, averageRating, currentUserId } = data

  const initials =
    profile.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "??"

  const isOwnProfile = currentUserId === profile.id
  const displayReviews: DisplayReview[] = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    review_text: review.review_text ?? undefined,
    would_recommend: review.would_recommend ?? undefined,
    created_at: review.created_at,
    reviewer: {
      full_name: review.reviewer?.full_name ?? undefined,
      profile_photo_url: review.reviewer?.profile_photo_url ?? undefined,
      verification_tier: review.reviewer?.verification_tier ?? "basic",
    },
    accuracy_rating: review.accuracy_rating ?? undefined,
    communication_rating: review.communication_rating ?? undefined,
    cleanliness_rating: review.cleanliness_rating ?? undefined,
    responsibility_rating: review.responsibility_rating ?? undefined,
  }))

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.profile_photo_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">{profile.full_name || "Anonymous User"}</h1>
                        {profile.verification_tier === "premium" && <BadgeIcon type="premium" />}
                        {profile.verification_tier === "enhanced" && <BadgeIcon type="verified" />}
                      </div>

                      <div className="flex items-center gap-4 text-muted-foreground">
                        {profile.user_type && (
                          <Badge variant="secondary" className="capitalize">
                            {profile.user_type}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            Joined{" "}
                            {new Date(profile.created_at).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isOwnProfile && (
                      <Button asChild>
                        <Link href={`/messages/new?userId=${profile.id}`}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message
                        </Link>
                      </Button>
                    )}
                  </div>

                  {profile.bio && <p className="text-foreground leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>}

                  <div className="flex items-center gap-4">
                    {averageRating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary fill-primary" />
                        <span className="font-semibold">{averageRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">
                          ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Home className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{listings.length}</p>
                <p className="text-xs text-muted-foreground">Listings</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{averageRating > 0 ? averageRating.toFixed(1) : "N/A"}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <MessageCircle className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold capitalize">{profile.verification_tier || "Basic"}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </CardContent>
            </Card>
          </div>

          {/* Listings */}
          {listings.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Active Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <Link key={listing.id} href={`/listings/${listing.id}`}>
                      <div className="rounded-lg border border-border p-4 transition-colors hover:bg-muted">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{listing.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{listing.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {listing.address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {listing.address.city}, {listing.address.state}
                                  </span>
                                </div>
                              )}
                              {listing.pets && listing.pets.length > 0 && (
                                <Badge variant="secondary">{listing.pets.length} pets</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Reviews</h2>
              <div className="space-y-4">
                {displayReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          )}

          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                <p className="text-muted-foreground">This user hasn't received any reviews yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
