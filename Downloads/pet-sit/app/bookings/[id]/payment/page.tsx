import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookingPaymentForm } from "@/components/features/booking-payment-form"
import { calculateBookingFees, CLEANING_FEE, SERVICE_FEE_PER_NIGHT } from "@/lib/pricing/fees"
import { getServerEnv } from "@/lib/env/server"

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      start_date,
      end_date,
      status,
      sitter_id,
      payment_status,
      service_fee_per_night,
      cleaning_fee,
      insurance_cost,
      listing:listings(title)
    `,
    )
    .eq("id", id)
    .single()

  if (bookingError || !booking) {
    notFound()
  }

  // Check authorization
  if (booking.sitter_id !== user.id) {
    redirect("/dashboard")
  }

  // Check if already paid
  if (booking.payment_status === "paid") {
    redirect(`/sits/${id}`)
  }

  if (!["confirmed", "accepted"].includes(booking.status)) {
    redirect(`/sits/${id}`)
  }

  let pointsBalance = 0
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("points_ledger")
    .select("points_delta")
    .eq("user_id", user.id)

  if (ledgerError) {
    console.warn("[sitswap] Unable to load points balance:", ledgerError)
  } else {
    pointsBalance = (ledgerRows ?? []).reduce((sum, row) => sum + Number(row.points_delta || 0), 0)
  }

  pointsBalance = Math.max(pointsBalance, 0)

  const listing = booking.listing as { title?: string } | { title?: string }[] | null | undefined
  const listingTitle = Array.isArray(listing) ? listing[0]?.title : listing?.title

  const feeSummary = calculateBookingFees({
    startDate: booking.start_date,
    endDate: booking.end_date,
    serviceFeePerNight: Number(booking.service_fee_per_night ?? SERVICE_FEE_PER_NIGHT),
    cleaningFee: Number(booking.cleaning_fee ?? CLEANING_FEE),
    insuranceCost: Number(booking.insurance_cost ?? 0),
  })

  const { ALLOW_MANUAL_BOOKING_PAYMENTS } = getServerEnv()
  const manualPaymentsEnabled =
    process.env.NODE_ENV !== "production" || Boolean(ALLOW_MANUAL_BOOKING_PAYMENTS)

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Complete Payment</h1>
          <p className="mt-2 text-muted-foreground">Service fee and cleaning fee for your stay</p>
        </div>

        <BookingPaymentForm
          bookingId={booking.id}
          listingTitle={listingTitle || "Sit"}
          startDate={booking.start_date}
          endDate={booking.end_date}
          serviceFeePerNight={feeSummary.serviceFeePerNight}
          cleaningFee={feeSummary.cleaningFee}
          insuranceCost={feeSummary.insuranceCost}
          pointsBalance={pointsBalance}
          manualPaymentsEnabled={manualPaymentsEnabled}
        />
      </div>
    </div>
  )
}
