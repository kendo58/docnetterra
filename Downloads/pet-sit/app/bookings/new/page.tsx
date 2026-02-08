import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "@/components/features/booking-form"
import { Navbar } from "@/components/navigation/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type NewBookingSearchParams = { listing?: string; match?: string; sitter?: string; rebook?: string; rebook_from?: string }

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<NewBookingSearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  if (!params.listing) {
    redirect("/dashboard")
  }

  const invitedSitterId = params.sitter?.trim() || null
  const rebookFromId = params.rebook_from?.trim() || null
  const isRebook = params.rebook === "1" || params.rebook === "true"

  // Fetch listing details
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      `
      *,
      address:addresses(city, state),
      pets(*),
      availability(*),
      user:profiles(id, full_name)
    `,
    )
    .eq("id", params.listing)
    .single()

  if (listingError || !listing) {
    notFound()
  }

  const isInviteFlow = Boolean(invitedSitterId && invitedSitterId !== user.id)

  if (isInviteFlow && listing.user_id !== user.id) {
    redirect("/dashboard")
  }

  const { data: invitedSitter } = isInviteFlow
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", invitedSitterId)
        .maybeSingle()
    : { data: null }

  // Check if there's a match
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("listing_id", listing.id)
    .eq("sitter_id", user.id)
    .eq("is_match", true)
    .maybeSingle()

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href={`/listings/${params.listing}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Listing
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {isInviteFlow
                ? `Invite ${invitedSitter?.full_name?.trim() || "sitter"} to Stay`
                : "Request a Sit"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isInviteFlow
                ? "Choose dates to invite this sitter to your listing."
                : "Select dates and optional insurance for your stay"}
            </p>
          </div>

          <BookingForm
            listing={listing}
            match={match}
            userId={user.id}
            invitedSitterId={invitedSitterId}
            isRebook={isRebook}
            rebookFromId={rebookFromId}
          />
        </div>
      </div>
    </>
  )
}
