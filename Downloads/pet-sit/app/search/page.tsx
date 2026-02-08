import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, LayoutGrid, Map as MapIcon } from "lucide-react"
import { ListingCard } from "@/components/features/listing-card"
import { Navbar } from "@/components/navigation/navbar"
import { Footer } from "@/components/features/footer"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { QuickSearch } from "@/components/features/quick-search"
import { ListingsMap } from "@/components/features/listings-map"
import { getUsCityCenterCoordinates } from "@/lib/geo/us-cities"
import type { Listing, Pet } from "@/lib/types/database"

type SearchParams = {
  q?: string
  state?: string
  city?: string
  start?: string
  end?: string
  pet_type?: string
  task_type?: string
  listing_type?: string
  verified?: string
  view?: "grid" | "map"
  sort?: "best" | "newest"
  page?: string
}

type ListingAddress = {
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  [key: string]: unknown
}

type SearchListing = Listing & {
  pets?: Pet[] | null
  tasks?: Array<{ task_type: string | null }> | null
  user?: { full_name: string | null; verification_tier: string | null } | null
  address: ListingAddress | ListingAddress[] | null
}

type ListingCardListing = Parameters<typeof ListingCard>[0]["listing"]

const toListingCardListing = (listing: SearchListing): ListingCardListing => {
  const rawAddress = Array.isArray(listing.address) ? listing.address[0] : listing.address

  return {
    ...listing,
    address: rawAddress
      ? {
          city: rawAddress.city ?? "",
          state: rawAddress.state ?? "",
        }
      : undefined,
    pets: listing.pets ?? undefined,
    tasks: (listing.tasks ?? [])
      .filter((task): task is { task_type: string | null } => task !== null)
      .map((task) => ({ task_type: task.task_type ?? "" })),
    user: listing.user
      ? {
          full_name: listing.user.full_name ?? undefined,
          verification_tier: listing.user.verification_tier ?? undefined,
        }
      : undefined,
  }
}

async function searchListings(searchParams: SearchParams) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const sort = searchParams.sort === "newest" ? "newest" : "best"
  const pageSize = 20
  const rawPage = Number.parseInt(searchParams.page ?? "1", 10)
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const q = searchParams.q?.trim() || ""
  const state = searchParams.state?.trim() || ""
  const city = searchParams.city?.trim() || ""
  const listingType = searchParams.listing_type?.trim() || ""
  const petType = searchParams.pet_type?.trim() || ""
  const taskType = searchParams.task_type?.trim() || ""
  const verified = searchParams.verified?.trim() || ""
  const start = searchParams.start?.trim() || ""
  const end = searchParams.end?.trim() || ""

  const wantsDateFilter = Boolean(start && end)
  const wantsLocationFilter = Boolean(city || state)

  const addressJoin = `address:addresses!listings_address_id_fkey${wantsLocationFilter ? "!inner" : ""}(*)`
  const petsJoin = `pets${petType ? "!inner" : ""}(*)`
  const tasksJoin = `tasks${taskType ? "!inner" : ""}(*)`
  const availabilityJoin = `availability${wantsDateFilter ? "!inner" : ""}(*)`

  const today = new Date().toISOString().slice(0, 10)
  const { data: bookedRows, error: bookedError } = await supabase
    .from("availability")
    .select("listing_id")
    .eq("is_booked", true)
    .gte("end_date", today)

  if (bookedError) {
    console.warn("[sitswap] Failed to load booked listings:", bookedError)
  }

  const bookedListingIds = Array.from(new Set((bookedRows ?? []).map((row) => row.listing_id))).filter(Boolean)

  const select = `
    *,
    ${petsJoin},
    ${tasksJoin},
    ${availabilityJoin},
    user:profiles!listings_user_id_fkey(*),
    ${addressJoin}
  `

  const buildQuery = (opts: { useFts: boolean; orderByTier: boolean; page: number }) => {
    const from = (opts.page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("listings")
      .select(select, { count: "exact" })
      .eq("is_active", true)
      .neq("user_id", user.id)

    if (bookedListingIds.length > 0) {
      query = query.not("id", "in", `(${bookedListingIds.join(",")})`)
    }

    if (wantsLocationFilter) {
      if (state) query = query.eq("address.state", state)
      if (city) query = query.ilike("address.city", city)
    }

    if (wantsDateFilter) {
      query = query.eq("availability.is_booked", false).lte("availability.start_date", start).gte("availability.end_date", end)
    }

    if (listingType) query = query.eq("listing_type", listingType)
    if (petType) query = query.ilike("pets.species", petType)
    if (taskType) query = query.eq("tasks.task_type", taskType)

    if (verified === "verified") {
      query = query.neq("user.verification_tier", "basic")
    } else if (verified === "premium") {
      query = query.eq("user.verification_tier", "premium")
    }

    if (q && opts.useFts) {
      query = query.textSearch("search_document", q, { type: "websearch", config: "english" })
    } else if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }

    query =
      sort === "newest"
        ? query.order("created_at", { ascending: false })
        : opts.orderByTier
          ? query.order("verification_tier", { foreignTable: "user", ascending: false }).order("created_at", { ascending: false })
          : query.order("created_at", { ascending: false })

    return query.range(from, to)
  }

  const run = async (page: number) => {
    // Attempt: FTS + best ordering, then fallbacks for older schemas / ordering syntax.
    let result = await buildQuery({ useFts: true, orderByTier: sort === "best", page })
    if (result.error && sort === "best") {
      result = await buildQuery({ useFts: true, orderByTier: false, page })
    }

    if (result.error && q) {
      result = await buildQuery({ useFts: false, orderByTier: sort === "best", page })
      if (result.error && sort === "best") {
        result = await buildQuery({ useFts: false, orderByTier: false, page })
      }
    }

    return result
  }

  const firstRun = await run(requestedPage)
  let listings = firstRun.data
  let error = firstRun.error
  const count = firstRun.count

  const total = count ?? 0
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages)

  if (page !== requestedPage) {
    const rerun = await run(page)
    listings = rerun.data
    error = rerun.error
  }

  if (error) {
    console.error("[sitswap] Search query failed:", error)
    return { listings: [] as SearchListing[], total: 0, page, pageSize, totalPages, sort, user }
  }

  return {
    listings: (listings as SearchListing[] | null) ?? [],
    total,
    page,
    pageSize,
    totalPages,
    sort,
    user,
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { listings, total, page, totalPages, sort, user } = await searchListings(params)
  const view: "grid" | "map" = params.view === "map" ? "map" : "grid"

  const activeFilters = [
    params.q,
    params.state,
    params.city,
    params.start,
    params.end,
    params.pet_type,
    params.task_type,
    params.listing_type,
    params.verified,
  ].filter(Boolean).length

  const buildUrl = (
    current: SearchParams,
    overrides: Record<string, string | undefined> = {},
    remove: string[] = [],
  ) => {
    const sp = new URLSearchParams()
    const merged = { ...current, ...overrides } as Record<string, string | undefined>

    for (const [key, value] of Object.entries(merged)) {
      if (!value) continue
      if (remove.includes(key)) continue
      sp.set(key, value)
    }

    const qs = sp.toString()
    return qs ? `/search?${qs}` : "/search"
  }

  const mapUrl = buildUrl(params, { view: "map" })

  const gridUrl = buildUrl(params, { view: undefined }, ["view"])

  const newestUrl = buildUrl(params, { sort: "newest", page: undefined }, ["page"])
  const bestUrl = buildUrl(params, { sort: undefined, page: undefined }, ["sort", "page"])

  const prevUrl = page > 1 ? buildUrl(params, { page: String(page - 1) }) : null
  const nextUrl = totalPages > 0 && page < totalPages ? buildUrl(params, { page: String(page + 1) }) : null

  const mapListings =
    view === "map"
      ? listings.map((listing) => {
          const rawAddress = Array.isArray(listing.address) ? listing.address[0] : listing.address
          if (!rawAddress) return { ...listing, address: null }
          const normalizedAddress = {
            ...rawAddress,
            city: rawAddress.city ?? undefined,
            state: rawAddress.state ?? undefined,
          }

          const hasLat = rawAddress.latitude !== null && rawAddress.latitude !== undefined && String(rawAddress.latitude).trim() !== ""
          const hasLng = rawAddress.longitude !== null && rawAddress.longitude !== undefined && String(rawAddress.longitude).trim() !== ""

          if (hasLat && hasLng) return { ...listing, address: normalizedAddress }

          const coords =
            rawAddress.city && rawAddress.state ? getUsCityCenterCoordinates(String(rawAddress.city), String(rawAddress.state)) : null

          if (!coords) return { ...listing, address: normalizedAddress }

          return {
            ...listing,
            address: {
              ...normalizedAddress,
              latitude: coords.lat,
              longitude: coords.lng,
            },
          }
        })
      : null

  const listingCards = listings.map(toListingCardListing)

  const locationLabel = params.city
    ? `${params.city}${params.state ? `, ${params.state}` : ""}`
    : params.state
      ? params.state
      : "Anywhere"

  const resultsHeading = locationLabel === "Anywhere" ? `${total} listing${total === 1 ? "" : "s"}` : `${total} listing${total === 1 ? "" : "s"} in ${locationLabel}`

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-6 md:pb-8 md:pt-16 bg-background flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 space-y-5">
          <QuickSearch
            sticky
            collapsible
            showChips
            showFilters
            hiddenFields={{ view: view === "map" ? "map" : undefined }}
            defaults={{
              q: params.q,
              city: params.city,
              state: params.state,
              start: params.start,
              end: params.end,
              listing_type: params.listing_type,
              pet_type: params.pet_type,
              task_type: params.task_type,
              verified: params.verified,
            }}
          />

          <div className="h-px w-full bg-border/70" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold">{resultsHeading}</h1>
                {activeFilters > 0 && (
                  <Badge variant="secondary" className="rounded-full">
                    {activeFilters} filter{activeFilters > 1 ? "s" : ""} active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Find homes with pets to care for or chores to complete. Your listings show under My Listings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full border bg-background p-1 shadow-xs">
                <Button
                  size="sm"
                  variant={sort === "best" ? "default" : "ghost"}
                  asChild
                  className="rounded-full"
                >
                  <Link href={bestUrl}>Best</Link>
                </Button>
                <Button
                  size="sm"
                  variant={sort === "newest" ? "default" : "ghost"}
                  asChild
                  className="rounded-full"
                >
                  <Link href={newestUrl}>Newest</Link>
                </Button>
              </div>

              <div className="inline-flex items-center rounded-full border bg-background p-1 shadow-xs">
                <Button
                  size="sm"
                  variant={view === "grid" ? "default" : "ghost"}
                  asChild
                  className="rounded-full"
                >
                  <Link href={gridUrl}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    List
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant={view === "map" ? "default" : "ghost"}
                  asChild
                  className="rounded-full"
                >
                  <Link href={mapUrl}>
                    <MapIcon className="mr-2 h-4 w-4" />
                    Map
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            {listings.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center border-dashed bg-muted/20">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Search className="w-8 h-8 text-primary/70" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or{" "}
                  <Link href="/search" className="text-primary underline underline-offset-4">
                    clear filters
                  </Link>
                  .
                </p>
              </Card>
            ) : (
              <>
                {view === "map" ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {listingCards.map((listing, index) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          currentUserId={user.id}
                          showLikeButton
                          index={index}
                        />
                      ))}
                    </div>
                    <div className="h-[60vh] lg:h-[calc(100vh-200px)] lg:sticky lg:top-24">
                      <ListingsMap listings={mapListings ?? []} />
                    </div>
                  </div>
                ) : (
                  /* Responsive grid for results */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {listingCards.map((listing, index) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        currentUserId={user.id}
                        showLikeButton
                        index={index}
                      />
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button variant="outline" className="bg-transparent" disabled={!prevUrl} asChild={Boolean(prevUrl)}>
                      {prevUrl ? <Link href={prevUrl}>Previous</Link> : <span>Previous</span>}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page <span className="font-medium text-foreground">{page}</span> of{" "}
                      <span className="font-medium text-foreground">{totalPages}</span>
                    </div>
                    <Button variant="outline" className="bg-transparent" disabled={!nextUrl} asChild={Boolean(nextUrl)}>
                      {nextUrl ? <Link href={nextUrl}>Next</Link> : <span>Next</span>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Mobile "Show map/list" floating toggle (Airbnb-inspired) */}
      <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center md:hidden">
        <Button asChild variant="secondary" className="rounded-full shadow-lg">
          <Link href={view === "map" ? gridUrl : mapUrl}>
            {view === "map" ? <LayoutGrid className="mr-2 h-4 w-4" /> : <MapIcon className="mr-2 h-4 w-4" />}
            {view === "map" ? "Show list" : "Show map"}
          </Link>
        </Button>
      </div>
    </>
  )
}
