"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Coins, Lock } from "lucide-react"
import { completeBookingPayment, createBookingPaymentCheckoutSession } from "@/app/actions/payments"
import { calculateBookingFees, clampPoints } from "@/lib/pricing/fees"
import { launchConfetti } from "@/lib/confetti"

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface BookingPaymentFormProps {
  bookingId: string
  listingTitle: string
  startDate: string
  endDate: string
  serviceFeePerNight: number
  cleaningFee: number
  insuranceCost: number
  pointsBalance: number
  manualPaymentsEnabled: boolean
}

export function BookingPaymentForm({
  bookingId,
  listingTitle,
  startDate,
  endDate,
  serviceFeePerNight,
  cleaningFee,
  insuranceCost,
  pointsBalance,
  manualPaymentsEnabled,
}: BookingPaymentFormProps) {
  const router = useRouter()
  const [pointsToApply, setPointsToApply] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const feeSummary = useMemo(
    () =>
      calculateBookingFees({
        startDate,
        endDate,
        serviceFeePerNight,
        cleaningFee,
        insuranceCost,
      }),
    [cleaningFee, endDate, insuranceCost, serviceFeePerNight, startDate],
  )

  const safeBalance = Math.max(pointsBalance, 0)
  const maxPoints = Math.min(safeBalance, feeSummary.nights)
  const appliedPoints = clampPoints({ requested: pointsToApply, balance: safeBalance, nights: feeSummary.nights })
  const pointsValue = appliedPoints * feeSummary.serviceFeePerNight
  const cashDue = Math.max(feeSummary.totalFee - pointsValue, 0)
  const requiresCardCheckout = cashDue > 0

  const handleMaxPoints = () => {
    setPointsToApply(maxPoints)
  }

  const finishSuccess = useCallback(() => {
    setPaymentComplete(true)
    void launchConfetti("success")
    setTimeout(() => {
      router.push(`/sits/${bookingId}?payment=success`)
    }, 1500)
  }, [bookingId, router])

  const fetchClientSecret = useCallback(async () => {
    const result = await createBookingPaymentCheckoutSession(bookingId, appliedPoints)
    if (result.error || !result.clientSecret) {
      throw new Error(result.error ?? "Unable to initialize secure payment.")
    }
    return result.clientSecret
  }, [appliedPoints, bookingId])

  const handlePayment = async () => {
    setError(null)

    if (requiresCardCheckout) {
      if (!stripePromise) {
        if (manualPaymentsEnabled) {
          // Dev-only fallback when Stripe is not configured.
          setIsSubmitting(true)
          const result = await completeBookingPayment(bookingId, appliedPoints)
          if (result?.error) {
            setError(result.error)
            setIsSubmitting(false)
            return
          }
          finishSuccess()
          return
        }

        setError("Stripe checkout is not configured for this environment.")
        return
      }

      setShowCheckout(true)
      return
    }

    setIsSubmitting(true)
    const result = await completeBookingPayment(bookingId, appliedPoints)
    if (result?.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    finishSuccess()
  }

  if (paymentComplete) {
    return (
      <Card className="py-12 text-center">
        <CardContent className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
          <p className="text-muted-foreground">Thanks! Redirecting to your sit details...</p>
        </CardContent>
      </Card>
    )
  }

  if (showCheckout && requiresCardCheckout && stripePromise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              fetchClientSecret,
              onComplete: finishSuccess,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => setShowCheckout(false)}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{listingTitle}</p>
              <p className="text-sm text-muted-foreground">
                {feeSummary.nights} night{feeSummary.nights !== 1 ? "s" : ""} • Service + Cleaning
              </p>
            </div>
            <Badge variant="secondary">
              <CreditCard className="mr-1 h-3 w-3" />
              Fees
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Service fee (${feeSummary.serviceFeePerNight}/night)</span>
              <span>${feeSummary.serviceFeeTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cleaning fee</span>
              <span>${feeSummary.cleaningFee.toFixed(2)}</span>
            </div>
            {feeSummary.insuranceCost > 0 && (
              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${feeSummary.insuranceCost.toFixed(2)}</span>
              </div>
            )}
            {appliedPoints > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>Points applied</span>
                <span>- ${pointsValue.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total due</span>
              <span className="text-2xl text-primary">${cashDue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Use points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{pointsBalance}</span> points. Each point covers one
            night of the service fee.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              max={maxPoints}
              value={pointsToApply}
              onChange={(event) => setPointsToApply(Number(event.target.value))}
              className="w-28"
            />
            <Button type="button" variant="outline" className="bg-transparent" onClick={handleMaxPoints}>
              Use max ({maxPoints})
            </Button>
          </div>

          {requiresCardCheckout ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              You will complete card checkout for the remaining balance. Points are applied after successful payment.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              No cash checkout required. This booking can be paid fully with points.
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePayment} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : requiresCardCheckout ? "Proceed to secure payment" : "Complete payment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
