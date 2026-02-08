"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Lock, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createCheckoutSession } from "@/app/actions/stripe"
import { updateBookingStatus } from "@/app/actions/bookings"
import { launchConfetti } from "@/lib/confetti"

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface PaymentFormProps {
  booking: {
    id: string
    insurance_cost: number
    insurance_plan_type: string
    listing: { title: string }
  }
}

export function PaymentForm({ booking }: PaymentFormProps) {
  const router = useRouter()
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const fetchClientSecret = useCallback(() => {
    return createCheckoutSession(
      booking.id,
      booking.insurance_cost || 0,
      `${booking.listing?.title || "Sit"} - ${booking.insurance_plan_type || "Standard"} Protection`,
    )
  }, [booking])

  const handleComplete = useCallback(async () => {
    setPaymentComplete(true)

    const result = await updateBookingStatus(booking.id, "confirmed")
    if (result?.error) {
      console.error("[sitswap] Payment completed but booking confirmation failed:", result.error)
    }
    void launchConfetti("success")

    setTimeout(() => {
      router.push(`/sits/${booking.id}?payment=success`)
    }, 2000)
  }, [booking.id, router])

  if (paymentComplete) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
          <p className="text-muted-foreground">Your sit is confirmed. Redirecting...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{booking.listing?.title || "Sit"}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {booking.insurance_plan_type || "Standard"} Protection Plan
              </p>
            </div>
            <Badge variant="secondary">
              <Shield className="mr-1 h-3 w-3" />
              Insurance
            </Badge>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-2xl text-primary">${booking.insurance_cost || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      {!showCheckout ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Secure Payment with Stripe</p>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    Your payment is processed securely through Stripe. We never store your card details.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={() => setShowCheckout(true)} className="flex-1">
                Proceed to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {stripePromise ? (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  fetchClientSecret,
                  onComplete: handleComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-6 text-center">
                <div className="text-lg font-semibold">Payments not configured</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Set <span className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> to enable Stripe checkout.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
