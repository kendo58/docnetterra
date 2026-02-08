"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ListingCard } from "@/components/features/listing-card"
import { EmptyState } from "@/components/ui/empty-state"
import { OnboardingChecklist } from "@/components/features/onboarding-checklist"
import { ActivityFeed } from "@/components/features/activity-feed"
import { StatsCards } from "@/components/features/stats-cards"
import { LiveNotifications } from "@/components/features/live-notifications"
import { SkeletonList } from "@/components/ui/skeleton-card"
import { ProfileCompletion } from "@/components/features/profile-completion"
import { OnboardingWizard } from "@/components/features/onboarding-wizard"
import { PossibleMatches } from "@/components/features/possible-matches"
import { Home, PlusCircle, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navigation/navbar"
import { Badge } from "@/components/ui/badge"
import { isStayListing as isStayListingType } from "@/lib/utils/listing-type"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { User } from "@supabase/supabase-js"

type DashboardProfile = {
  id: string
  full_name: string | null
  onboarding_completed: boolean | null
  profile_photo_url?: string | null
  bio?: string | null
  verification_tier?: string | null
  address?: { city?: string | null; state?: string | null } | Array<{ city?: string | null; state?: string | null }> | null
}

type DashboardListing = Parameters<typeof ListingCard>[0]["listing"]
type CityRow = { city: string | null }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<DashboardProfile | null>(null)
  const [listings, setListings] = useState<DashboardListing[]>([])
  const [userListings, setUserListings] = useState<Array<{ id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [stats, setStats] = useState({
    totalListings: 0,
    activeUsers: 0,
    matches: 0,
    avgRating: 4.8,
    citiesCovered: 0,
    successfulBookings: 0,
  })

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/auth/login")
          return
        }

        setUser(session.user)

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*, address:addresses(*)")
          .eq("id", session.user.id)
          .maybeSingle<DashboardProfile>()

        setProfile(profileData)

        if (profileData && !profileData.onboarding_completed) {
          setShowOnboarding(true)
        }

        const today = new Date().toISOString().slice(0, 10)
        const { data: bookedRows, error: bookedError } = await supabase
          .from("availability")
          .select("listing_id")
          .eq("is_booked", true)
          .gte("end_date", today)

        if (bookedError) {
          console.warn("[sitswap] Failed to load booked listings:", bookedError)
        }

        const bookedListingIds = new Set((bookedRows ?? []).map((row) => row.listing_id))

        // Fetch listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select(`
            *,
            address:addresses(city, state),
            pets(*),
            user:profiles(full_name, verification_tier)
          `)
          .eq("is_active", true)
          .neq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (listingsError) {
          console.error("[sitswap] Error fetching listings:", listingsError)
          setError("Failed to load listings")
        } else {
          const filteredListings = ((listingsData as DashboardListing[] | null) ?? []).filter(
            (listing) => !bookedListingIds.has(listing.id),
          )
          setListings(filteredListings)
        }

        const { data: userListingsData } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)

        setUserListings(((userListingsData as Array<{ id: string }> | null) ?? []))

        // Fetch stats
        const [
          { count: listingsCount },
          { count: usersCount },
          { count: matchesCount },
          { data: citiesData },
          { count: bookingsCount },
        ] = await Promise.all([
          supabase.from("listings").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("matches").select("*", { count: "exact", head: true }).eq("is_match", true),
          supabase.from("addresses").select("city").limit(1000),
          supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
        ])

        const uniqueCities = new Set(((citiesData as CityRow[] | null) ?? []).map((address) => address.city).filter(Boolean))

        setStats({
          totalListings: listingsCount || 0,
          activeUsers: usersCount || 0,
          matches: matchesCount || 0,
          avgRating: 4.8,
          citiesCovered: uniqueCities.size,
          successfulBookings: bookingsCount || 0,
        })
      } catch (err) {
        console.error("[sitswap] Dashboard error:", err)
        setError("Failed to load dashboard. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    if (user) {
      const supabase = createClient()
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id)
    }
  }

  const isStayListing = (listing: DashboardListing) => {
    return isStayListingType(listing)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pb-24 pt-20 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="h-8 w-48 skeleton mb-2" />
              <div className="h-5 w-64 skeleton" />
            </div>
            <SkeletonList count={6} />
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center animate-fade-in">
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => router.push("/auth/login")} className="btn-press">
              Return to Login
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      {user && <LiveNotifications userId={user.id} />}
      <OnboardingWizard open={showOnboarding} onComplete={handleOnboardingComplete} />

      <div className="min-h-screen pb-24 pt-20 md:pb-8 page-transition">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
                <Badge variant="secondary" className="animate-pulse-soft hidden sm:flex">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
                Find your perfect pet sitting opportunity
              </p>
            </div>
            <Link href="/listings/new">
              <Button className="btn-press hover-lift w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Listing
              </Button>
            </Link>
          </div>

          {profile && <ProfileCompletion profile={profile} listings={userListings} className="mb-6" />}

          {/* Stats Section */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 animate-fade-in">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Platform Stats
            </h2>
            <StatsCards stats={stats} />
          </div>

          {/* Onboarding */}
          <div className="mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <OnboardingChecklist />
          </div>

          {user && <PossibleMatches userId={user.id} className="mb-6 sm:mb-8" />}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Listings */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold animate-fade-in">Browse Listings</h2>
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="all" className="flex-1 sm:flex-none">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="sitter" className="flex-1 sm:flex-none">
                      Find Sitter
                    </TabsTrigger>
                    <TabsTrigger value="stay" className="flex-1 sm:flex-none">
                      Find Stay
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all">
                  {listings && listings.length > 0 ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {listings.map((listing, index) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          showLikeButton
                          currentUserId={user?.id}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Home}
                      title="No listings yet"
                      description="Be the first to create a listing and connect with trusted sitters"
                      actionLabel="Create Listing"
                      actionHref="/listings/new"
                    />
                  )}
                </TabsContent>

                <TabsContent value="sitter">
                  {listings.filter((l) => !isStayListing(l)).length > 0 ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {listings
                        .filter((l) => !isStayListing(l))
                        .map((listing, index) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            showLikeButton
                            currentUserId={user?.id}
                            index={index}
                          />
                        ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Home}
                      title="No sitter listings"
                      description="No one is looking for a sitter right now"
                    />
                  )}
                </TabsContent>

                <TabsContent value="stay">
                  {listings.filter((l) => isStayListing(l)).length > 0 ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {listings
                        .filter((l) => isStayListing(l))
                        .map((listing, index) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            showLikeButton
                            currentUserId={user?.id}
                            index={index}
                          />
                        ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Home}
                      title="No stay listings"
                      description="No one is looking for a stay right now"
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Activity Feed Sidebar - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
