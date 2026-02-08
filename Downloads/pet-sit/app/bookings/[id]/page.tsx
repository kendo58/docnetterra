import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Shield, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Navbar } from "@/components/navigation/navbar"
import { updateBookingStatus } from "@/app/actions/bookings"
import { CancelBookingDialog } from "@/components/features/cancel-booking-dialog"

type BookingPet = {
  id: string
  name: string | null
  species: string | null
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      *,
      listing:listings(
        *,
        address:addresses!listings_address_id_fkey(*),
        pets(*),
        user:profiles!listings_user_id_fkey(*)
      ),
      sitter:profiles!bookings_sitter_id_fkey(*),
      canceller:profiles!bookings_cancelled_by_fkey(full_name)
    `,
    )
    .eq("id", id)
    .single()

  if (bookingError || !booking) {
    notFound()
  }

  const listingOwnerId = booking.listing?.user_id ?? booking.listing?.user?.id ?? null
  const listingAddress = Array.isArray(booking.listing?.address) ? booking.listing?.address[0] : booking.listing?.address
  const listingCity = listingAddress?.city
  const listingState = listingAddress?.state
  const listingLocation = listingCity && listingState ? `${listingCity}, ${listingState}` : listingCity || listingState || null
  const paymentStatus = booking.payment_status ?? "unpaid"
  const isPaymentComplete = paymentStatus === "paid"
  const canViewAddress = isPaymentComplete || listingOwnerId === user.id

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle()

  const hasReview = Boolean(existingReview?.id)

  // Check if user is authorized to view this booking
  const isAuthorized = booking.sitter_id === user.id || listingOwnerId === user.id
  if (!isAuthorized) {
    redirect("/dashboard")
  }

  const isSitter = booking.sitter_id === user.id
  const otherUserName = isSitter ? booking.listing?.user?.full_name : booking.sitter?.full_name
  const cancellerName = booking.canceller?.full_name
  const requesterId = booking.requested_by ?? booking.sitter_id
  const responderId = requesterId === booking.sitter_id ? listingOwnerId : booking.sitter_id
  const endDate = new Date(booking.end_date)
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-green-500/10 text-green-700 dark:text-green-400",
    accepted: "bg-green-500/10 text-green-700 dark:text-green-400",
    declined: "bg-red-500/10 text-red-700 dark:text-red-400",
    cancelled: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    refunded: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  }

  const statusIcons = {
    pending: Clock,
    confirmed: CheckCircle,
    accepted: CheckCircle,
    declined: XCircle,
    cancelled: XCircle,
    completed: CheckCircle,
    refunded: XCircle,
  }

  const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons] ?? Clock

  const canConfirmOrDecline = booking.status === "pending" && responderId === user.id
  const canCancel = ["pending", "confirmed", "accepted"].includes(booking.status)
  const autoCompletePending = ["confirmed", "accepted"].includes(booking.status) && isPaymentComplete
  const canPay =
    isSitter && ["confirmed", "accepted"].includes(booking.status) && !isPaymentComplete
  const listingId = booking.listing?.id ?? booking.listing_id ?? null
  const canRebook = booking.status === "cancelled" && Boolean(listingId)
  const rebookParams = new URLSearchParams()
  if (listingId) {
    rebookParams.set("listing", listingId)
    rebookParams.set("rebook", "1")
    rebookParams.set("rebook_from", booking.id)
    if (!isSitter && booking.sitter_id) {
      rebookParams.set("sitter", booking.sitter_id)
    }
  }
  const rebookHref = listingId ? `/sits/new?${rebookParams.toString()}` : null
  const rebookLabel = isSitter ? "Request again" : "Invite sitter again"

  async function handleConfirm() {
    "use server"
    await updateBookingStatus(booking.id, "confirmed")
  }

  async function handleDecline() {
    "use server"
    await updateBookingStatus(booking.id, "declined")
  }

  const conversationFilters = [
    booking.match_id ? `match_id.eq.${booking.match_id}` : null,
    listingOwnerId
      ? `and(listing_id.eq.${booking.listing_id},participant1_id.eq.${booking.sitter_id},participant2_id.eq.${listingOwnerId})`
      : null,
    listingOwnerId
      ? `and(listing_id.eq.${booking.listing_id},participant1_id.eq.${listingOwnerId},participant2_id.eq.${booking.sitter_id})`
      : null,
  ].filter(Boolean)

  const { data: conversation } =
    conversationFilters.length > 0
      ? await supabase
          .from("conversations")
          .select("id")
          .or(conversationFilters.join(","))
          .limit(1)
          .maybeSingle()
      : { data: null }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm">
                Messages
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Sit Details</h1>
            <p className="mt-2 text-muted-foreground">Reference ID: {id.slice(0, 8)}</p>
          </div>

          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="h-6 w-6" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={`capitalize ${statusColors[booking.status as keyof typeof statusColors]}`}>
                        {booking.status}
                      </Badge>
                      {!isPaymentComplete && ["confirmed", "accepted"].includes(booking.status) && (
                        <p className="mt-1 text-xs text-muted-foreground">Payment required</p>
                      )}
                      {autoCompletePending && booking.status !== "completed" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Auto-completes after {format(endDate, "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  {booking.status === "completed" && !hasReview && (
                    <Link href={`/reviews/${booking.id}`}>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Leave a review
                      </Button>
                    </Link>
                  )}
                  {canConfirmOrDecline && (
                    <div className="flex gap-2">
                      <form action={handleDecline}>
                        <Button variant="outline" size="sm" className="bg-transparent gap-1">
                          <XCircle className="h-4 w-4" />
                          Decline
                        </Button>
                      </form>
                      <form action={handleConfirm}>
                        <Button size="sm" className="gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Confirm
                        </Button>
                      </form>
                    </div>
                  )}
                  {canPay && (
                    <Link href={`/sits/${booking.id}/payment`}>
                      <Button size="sm" className="gap-1">
                        Complete payment
                      </Button>
                    </Link>
                  )}
                  {canRebook && rebookHref && (
                    <Link href={rebookHref}>
                      <Button size="sm" className="gap-1">
                        {rebookLabel}
                      </Button>
                    </Link>
                  )}
                  {canCancel && (
                    <CancelBookingDialog
                      bookingId={booking.id}
                      listingTitle={booking.listing?.title}
                      otherUserName={otherUserName}
                      buttonVariant="outline"
                      buttonSize="sm"
                      className="bg-transparent"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {booking.status === "cancelled" && booking.cancellation_reason && (
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {cancellerName && <p>Cancelled by {cancellerName}.</p>}
                  <p>{booking.cancellation_reason}</p>
                </CardContent>
              </Card>
            )}

            {/* Listing Info */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{booking.listing?.title ?? "Listing details unavailable"}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{listingLocation ?? "Location unavailable"}</span>
                  </div>
                </div>

                {booking.listing?.pets && booking.listing.pets.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Pets to care for:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {booking.listing.pets.map((pet: BookingPet) => (
                        <Badge key={pet.id} variant="secondary">
                          {pet.name} ({pet.species})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {booking.listing?.id && (
                  <Link href={`/listings/${booking.listing.id}`}>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      View Full Listing
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                {canViewAddress ? (
                  <div className="space-y-1 text-sm">
                    <div className="font-medium text-foreground">
                      {listingAddress?.street_address || "Address on file"}
                    </div>
                    {listingAddress?.apartment && <div>{listingAddress.apartment}</div>}
                    <div>
                      {[listingAddress?.city, listingAddress?.state].filter(Boolean).join(", ")}
                      {listingAddress?.postal_code ? ` ${listingAddress.postal_code}` : ""}
                    </div>
                    {listingAddress?.country && <div>{listingAddress.country}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Complete payment to unlock the full address and check-in instructions.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Stay Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="text-lg font-semibold">{format(new Date(booking.start_date), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="text-lg font-semibold">{format(new Date(booking.end_date), "MMM dd, yyyy")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insurance */}
            {booking.insurance_selected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Protection Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{booking.insurance_plan_type} Protection</p>
                      <p className="text-sm text-muted-foreground">Coverage active for entire stay</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${booking.insurance_cost}</p>
                      <p className="text-xs text-muted-foreground">One-time fee</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* People */}
            <Card>
              <CardHeader>
                <CardTitle>{isSitter ? "Homeowner" : "Sitter"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {isSitter
                        ? booking.listing?.user?.full_name ?? "Homeowner"
                        : booking.sitter?.full_name ?? "Sitter"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSitter ? booking.listing?.user?.email ?? "" : booking.sitter?.email ?? ""}
                    </p>
                  </div>
                  {conversation?.id && (
                    <Link href={`/messages/${conversation.id}`}>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Message
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
