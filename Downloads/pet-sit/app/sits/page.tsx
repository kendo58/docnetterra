import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navigation/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft, Eye, CheckCircle, XCircle } from "lucide-react"
import { updateBookingStatus } from "@/app/actions/bookings"
import { CancelBookingDialog } from "@/components/features/cancel-booking-dialog"

export const dynamic = "force-dynamic"

type SitRow = {
  id: string
  start_date: string
  end_date: string
  status: string
  created_at: string
  sitter_id: string
  requested_by?: string | null
  payment_status?: string | null
  listing: {
    id: string
    title: string
    user_id: string
    homeowner?: { id: string; full_name?: string | null; profile_photo_url?: string | null } | null
  }
  sitter?: { id: string; full_name?: string | null; profile_photo_url?: string | null } | null
}

function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
    case "confirmed":
    case "accepted":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
    case "declined":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
    case "cancelled":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
    case "completed":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
    case "refunded":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export default async function SitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: sits, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      start_date,
      end_date,
      status,
      created_at,
      sitter_id,
      requested_by,
      payment_status,
      listing:listings(
        id,
        title,
        user_id,
        homeowner:profiles!listings_user_id_fkey(id, full_name, profile_photo_url)
      ),
      sitter:profiles!bookings_sitter_id_fkey(id, full_name, profile_photo_url)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[sitswap] Failed to load sits:", error)
  }

  const rows: SitRow[] = (sits as SitRow[] | null) ?? []

  const incoming = rows.filter((s) => s.listing?.user_id === user.id)
  const outgoing = rows.filter((s) => s.sitter_id === user.id)


  const bookingIds = rows.map((sit) => sit.id)
  const { data: reviews } =
    bookingIds.length > 0
      ? await supabase.from("reviews").select("booking_id").in("booking_id", bookingIds).eq("reviewer_id", user.id)
      : { data: [] }

  const reviewedIds = new Set((reviews ?? []).map((review) => review.booking_id))

  const renderRow = (sit: SitRow) => {
    const role = sit.sitter_id === user.id ? "sitter" : "homeowner"
    const otherUser = role === "sitter" ? sit.listing?.homeowner : sit.sitter
    const otherName = otherUser?.full_name || "User"

    const requesterId = sit.requested_by || sit.sitter_id
    const responderId = requesterId === sit.sitter_id ? sit.listing?.user_id : sit.sitter_id
    const autoCompletePending =
      (sit.status === "confirmed" || sit.status === "accepted") && sit.payment_status === "paid"
    const canCancel = sit.status === "pending" || sit.status === "confirmed" || sit.status === "accepted"
    const canConfirmOrDecline = sit.status === "pending" && responderId === user.id
    const canReview = sit.status === "completed" && !reviewedIds.has(sit.id)
    const needsPayment = (sit.status === "confirmed" || sit.status === "accepted") && sit.payment_status !== "paid"
    const canPay = role === "sitter" && needsPayment
    const listingId = sit.listing?.id ?? null
    const canRebook = sit.status === "cancelled" && Boolean(listingId)
    const rebookParams = new URLSearchParams()
    if (listingId) {
      rebookParams.set("listing", listingId)
      rebookParams.set("rebook", "1")
      rebookParams.set("rebook_from", sit.id)
      if (role === "homeowner" && sit.sitter_id) {
        rebookParams.set("sitter", sit.sitter_id)
      }
    }
    const rebookHref = listingId ? `/sits/new?${rebookParams.toString()}` : null
    const rebookLabel = role === "sitter" ? "Request again" : "Invite again"

    async function handleConfirm() {
      "use server"
      await updateBookingStatus(sit.id, "confirmed")
    }

    async function handleDecline() {
      "use server"
      await updateBookingStatus(sit.id, "declined")
    }

    return (
      <Card key={sit.id} className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold truncate">{sit.listing?.title || "Sit"}</div>
                <Badge variant="outline" className={getStatusStyle(sit.status)}>
                  {sit.status}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{otherName}</span>{" "}
                <span className="text-muted-foreground">-</span>{" "}
                {new Date(sit.start_date).toLocaleDateString()} - {new Date(sit.end_date).toLocaleDateString()}
                {autoCompletePending && sit.status !== "completed" ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Auto-completes after {new Date(sit.end_date).toLocaleDateString()})
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link href={`/sits/${sit.id}`}>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </Link>

              {canRebook && rebookHref && (
                <Link href={rebookHref}>
                  <Button size="sm" className="gap-2">
                    {rebookLabel}
                  </Button>
                </Link>
              )}

              {canReview && (
                <Link href={`/reviews/${sit.id}`}>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    Leave review
                  </Button>
                </Link>
              )}

              {canPay && (
                <Link href={`/sits/${sit.id}/payment`}>
                  <Button size="sm" className="gap-2">
                    Complete payment
                  </Button>
                </Link>
              )}

              {canConfirmOrDecline && (
                <>
                  <form action={handleConfirm}>
                    <Button size="sm" className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirm
                    </Button>
                  </form>
                  <form action={handleDecline}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <XCircle className="h-4 w-4" />
                      Decline
                    </Button>
                  </form>
                </>
              )}

              {canCancel && (
                <CancelBookingDialog
                  bookingId={sit.id}
                  listingTitle={sit.listing?.title}
                  otherUserName={otherName}
                  buttonVariant="outline"
                  buttonSize="sm"
                  className="gap-2 bg-transparent"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold">Sits</h1>
            </div>
            <p className="mt-2 text-muted-foreground">Manage sit requests you've sent and received.</p>
          </div>

          <div className="space-y-8">
            <section className="space-y-3">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Incoming requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incoming.length > 0 ? incoming.map(renderRow) : <p className="text-sm text-muted-foreground">No incoming sit requests yet.</p>}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Your requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {outgoing.length > 0 ? outgoing.map(renderRow) : <p className="text-sm text-muted-foreground">No sit requests yet.</p>}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
