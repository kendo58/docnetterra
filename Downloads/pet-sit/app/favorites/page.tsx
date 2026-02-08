"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { ListingCard } from "@/components/features/listing-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, ArrowLeft, Search } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type FavoriteListing = Parameters<typeof ListingCard>[0]["listing"]

type FavoriteRow = {
  id: string
  listing: FavoriteListing | null
}

type FavoriteWithListing = {
  id: string
  listing: FavoriteListing
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteWithListing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFavorites = async () => {
      const supabase = createBrowserClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      const { data: favoritesData } = await supabase
        .from("favorites")
        .select(`
          id,
          listing:listings(
            *,
            address:addresses(*),
            pets(*)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const rows = ((favoritesData as FavoriteRow[] | null) ?? []).filter(
        (favorite): favorite is FavoriteWithListing => favorite.listing !== null,
      )
      setFavorites(rows)
      setIsLoading(false)
    }

    fetchFavorites()
  }, [router])

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pb-24 pt-20 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="mt-2 h-5 w-64" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="ghost" size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                Search Listings
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Saved Favorites</h1>
            <p className="mt-2 text-muted-foreground">Listings you've saved for later</p>
          </div>

          {favorites.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description="Save listings you're interested in to view them here"
              actionLabel="Browse Listings"
              actionHref="/search"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((favorite) => (
                <ListingCard
                  key={favorite.id}
                  listing={favorite.listing}
                  currentUserId={userId || undefined}
                  showLikeButton={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
