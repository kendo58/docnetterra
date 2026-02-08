import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileHeader } from "@/components/features/profile-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { Settings, LogOut, Shield, Star, Home, Calendar, BarChart3, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navigation/navbar"
import { TrustBadges } from "@/components/features/trust-badges"
import { ProfileCompletion } from "@/components/features/profile-completion"
import { AnalyticsDashboard } from "@/components/features/analytics-dashboard"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      *,
      address:addresses(*)
    `,
    )
    .eq("id", user.id)
    .single()

  // Fetch user's listings
  const { data: listings } = await supabase.from("listings").select("*").eq("user_id", user.id).eq("is_active", true)

  // Fetch user's bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("sitter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Fetch reviews about the user
  const { data: reviews } = await supabase.from("reviews").select("*").eq("reviewee_id", user.id)

  const averageRating =
    reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0

  const completedBookings = bookings?.filter((b) => b.status === "completed").length || 0

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Header Actions */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
            <div className="flex gap-2">
              <Link href="/sits">
                <Button variant="outline" size="sm" className="bg-transparent">
                  <Calendar className="mr-2 h-4 w-4" />
                  My Sits
                </Button>
              </Link>
              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="bg-transparent">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <ProfileCompletion profile={{ ...profile, address: profile?.address?.[0] }} listings={listings || []} />

            {/* Profile Header */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <ProfileHeader
                  profile={{ ...profile, address: profile?.address?.[0] }}
                  reviewCount={reviews?.length || 0}
                  averageRating={averageRating}
                />
                <div className="mt-4">
                  <TrustBadges
                    verificationTier={profile?.verification_tier}
                    reviewCount={reviews?.length || 0}
                    averageRating={averageRating}
                    completedBookings={completedBookings}
                    memberSince={profile?.created_at}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Shield className="h-5 w-5" />
                  Verification & Trust
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Identity Verified</p>
                        <p className="mt-1 font-semibold">
                          {profile?.verification_tier === "premium" || profile?.verification_tier === "enhanced"
                            ? "Yes"
                            : "Not Yet"}
                        </p>
                      </div>
                      {profile?.verification_tier === "premium" ? (
                        <BadgeIcon type="premium" />
                      ) : profile?.verification_tier === "enhanced" ? (
                        <BadgeIcon type="verified" />
                      ) : (
                        <Badge variant="secondary">Basic</Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Background Check</p>
                        <p className="mt-1 font-semibold">Not Completed</p>
                      </div>
                      <Badge variant="outline">Optional</Badge>
                    </div>
                  </div>
                </div>

                {profile?.verification_tier === "basic" && (
                  <Link href="/profile/verify">
                    <Button className="w-full bg-transparent" variant="outline">
                      <Shield className="mr-2 h-4 w-4" />
                      Get Verified
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Home className="mx-auto h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold">{listings?.length || 0}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Active Listings</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Calendar className="mx-auto h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold">{bookings?.length || 0}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Total Sits</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Star className="mx-auto h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold">
                    {averageRating ? averageRating.toFixed(1) : "N/A"}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </CardContent>
              </Card>
            </div>

            {listings && listings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <BarChart3 className="h-5 w-5" />
                    Your Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsDashboard userId={user.id} />
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {bookings && bookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Recent Sits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <Link key={booking.id} href={`/sits/${booking.id}`}>
                        <div className="rounded-lg border border-border p-3 sm:p-4 transition-colors hover:bg-muted">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm sm:text-base">Sit #{booking.id.slice(0, 8)}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(booking.start_date).toLocaleDateString()} -{" "}
                                {new Date(booking.end_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={booking.status === "accepted" ? "default" : "secondary"}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
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
