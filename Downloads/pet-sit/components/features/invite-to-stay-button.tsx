"use client"

import { useEffect, useMemo, useState, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isStayListing } from "@/lib/utils/listing-type"
import { cn } from "@/lib/utils"

type ListingOption = {
  id: string
  title: string
  listing_type?: string | null
  property_type?: string | null
  address?: { city?: string | null; state?: string | null } | null
}

type InviteToStayButtonProps = {
  sitterId: string
  sitterName?: string | null
  buttonLabel?: string
  buttonProps?: Omit<ComponentProps<typeof Button>, "onClick" | "children">
}

export function InviteToStayButton({ sitterId, sitterName, buttonLabel, buttonProps }: InviteToStayButtonProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<ListingOption[]>([])
  const [selectedListingId, setSelectedListingId] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true

    const loadListings = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error: listingsError } = await supabase
        .from("listings")
        .select("id, title, listing_type, property_type, address:addresses(city, state)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (!active) return

      if (listingsError) {
        console.error("[sitswap] Failed to load host listings:", listingsError)
        setError("We couldn't load your listings. Please try again.")
        setLoading(false)
        return
      }

      const hostListings = (data ?? [])
        .filter((listing) => !isStayListing(listing))
        .map((listing) => ({
          ...listing,
          address: Array.isArray(listing.address) ? listing.address[0] ?? null : listing.address ?? null,
        })) as ListingOption[]
      setListings(hostListings)
      setSelectedListingId(hostListings[0]?.id ?? "")
      setLoading(false)
    }

    loadListings()

    return () => {
      active = false
    }
  }, [open, router, supabase])

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId),
    [listings, selectedListingId],
  )

  const selectedLocation =
    selectedListing?.address?.city && selectedListing?.address?.state
      ? `${selectedListing.address.city}, ${selectedListing.address.state}`
      : selectedListing?.address?.city || selectedListing?.address?.state || ""

  const invitee = sitterName?.trim() || "this sitter"
  const { className, size, variant, ...restButtonProps } = buttonProps ?? {}
  const ctaLabel = buttonLabel ?? "Invite to Stay"

  const handleContinue = () => {
    if (!selectedListingId) return
    const params = new URLSearchParams({
      listing: selectedListingId,
      sitter: sitterId,
    })
    router.push(`/sits/new?${params.toString()}`)
  }

  return (
    <>
      <Button
        className={cn("w-full gap-2", className)}
        size={size ?? "lg"}
        variant={variant}
        onClick={() => setOpen(true)}
        {...restButtonProps}
      >
        <Calendar className="h-4 w-4" />
        {ctaLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite {invitee}</DialogTitle>
            <DialogDescription>Select which of your listings you'd like to host for.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your listings...
            </div>
          ) : error ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : listings.length === 0 ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>You need a hosting listing to invite a sitter.</p>
              <Link href="/listings/new">
                <Button variant="outline" className="bg-transparent">
                  Create a listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Choose a listing</label>
                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a listing" />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.map((listing) => {
                      const location =
                        listing.address?.city && listing.address?.state
                          ? `${listing.address.city}, ${listing.address.state}`
                          : listing.address?.city || listing.address?.state || "Location not set"
                      return (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.title} • {location}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedListing && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selectedListing.title}</div>
                  {selectedLocation && <div>{selectedLocation}</div>}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleContinue} disabled={!selectedListingId}>
                  Continue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
