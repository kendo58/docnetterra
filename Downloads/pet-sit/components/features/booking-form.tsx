"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Check, Calendar } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"
import { notifyBookingRequest } from "@/app/actions/booking-notifications"
import { calculateBookingFees, CLEANING_FEE, SERVICE_FEE_PER_NIGHT } from "@/lib/pricing/fees"

type BookingPet = {
  id: string
  name: string | null
  species: string | null
}

type BookingListing = {
  id: string
  title: string
  user_id: string
  user?: { id?: string | null } | null
  address?: { city?: string | null; state?: string | null } | null
  pets?: BookingPet[] | null
}

type BookingMatch = {
  id: string
}

interface BookingFormProps {
  listing: BookingListing
  match?: BookingMatch | null
  userId: string
  invitedSitterId?: string | null
  isRebook?: boolean
  rebookFromId?: string | null
}

const INSURANCE_PLANS = [
  {
    id: "none",
    name: "No Insurance",
    price: 0,
    features: ["No coverage", "Risk at your own expense"],
  },
  {
    id: "basic",
    name: "Basic Protection",
    price: 19,
    features: ["Personal injury: Up to $50K", "Property damage: Up to $2K", "Liability: Up to $250K"],
  },
  {
    id: "premium",
    name: "Premium Protection",
    price: 49,
    features: [
      "Personal injury: Up to $100K",
      "Property damage: Up to $5K",
      "Liability: Up to $500K",
      "Pet injury coverage: Up to $5K",
      "24/7 emergency support",
    ],
  },
]

export function BookingForm({ listing, match, userId, invitedSitterId, isRebook, rebookFromId }: BookingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isInvite = Boolean(invitedSitterId && invitedSitterId !== userId)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedInsurance, setSelectedInsurance] = useState("none")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const insurancePlanId = isInvite ? "none" : selectedInsurance
  const selectedPlan = INSURANCE_PLANS.find((plan) => plan.id === insurancePlanId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions")
      setIsLoading(false)
      return
    }

    try {
      // Create booking
      const sitterId = isInvite ? invitedSitterId : userId

      if (!sitterId) {
        throw new Error("Missing sitter information for this request.")
      }

      const listingOwnerId = listing?.user_id ?? listing?.user?.id
      if (listingOwnerId && sitterId === listingOwnerId) {
        setError("You can't book your own listing.")
        return
      }

      const feeSummary = calculateBookingFees({
        startDate,
        endDate,
        serviceFeePerNight: SERVICE_FEE_PER_NIGHT,
        cleaningFee: CLEANING_FEE,
        insuranceCost: !isInvite ? selectedPlan?.price || 0 : 0,
      })

      const bookingPayload = {
        listing_id: listing.id,
        sitter_id: sitterId,
        requested_by: userId,
        match_id: match?.id || null,
        start_date: startDate,
        end_date: endDate,
        status: "pending",
        insurance_selected: !isInvite && insurancePlanId !== "none",
        insurance_plan_type: !isInvite && insurancePlanId !== "none" ? insurancePlanId : null,
        insurance_cost: !isInvite ? selectedPlan?.price || 0 : 0,
        service_fee_per_night: feeSummary.serviceFeePerNight,
        cleaning_fee: feeSummary.cleaningFee,
        service_fee_total: feeSummary.serviceFeeTotal,
        total_fee: feeSummary.totalFee,
        cash_due: feeSummary.totalFee,
        points_applied: 0,
        payment_status: "unpaid",
      }

      let bookingResponse = await supabase.from("bookings").insert(bookingPayload).select().single()

      if (bookingResponse.error && isMissingColumnError(bookingResponse.error, "requested_by")) {
        const { requested_by: _requestedBy, ...legacyPayload } = bookingPayload
        bookingResponse = await supabase.from("bookings").insert(legacyPayload).select().single()
      }

      if (bookingResponse.error) throw bookingResponse.error

      const booking = bookingResponse.data

      const notificationResult = await notifyBookingRequest(booking.id, { isRebook, rebookFromId })
      if (notificationResult?.error) {
        console.warn("[sitswap] Failed to send booking request notification:", notificationResult.error)
      }

      router.push(`/sits/${booking.id}`)
    } catch (err: unknown) {
      console.error("[sitswap] Error creating booking:", err)
      setError(err instanceof Error ? err.message : "Failed to create booking.")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
        </div>
      )}

      {/* Listing Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{isInvite ? "Invitation Summary" : "Sit Summary"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{listing.title}</h3>
            <p className="text-sm text-muted-foreground">
              {listing.address?.city}, {listing.address?.state}
            </p>
            {listing.pets && listing.pets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.pets.map((pet: BookingPet) => (
                  <Badge key={pet.id} variant="secondary">
                    {pet.name} ({pet.species})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Select Dates</CardTitle>
          <CardDescription>
            {isInvite ? "Choose the dates you'd like to invite them for" : "Choose your stay duration"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>
          {startDate && endDate && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{calculateDays()} nights</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insurance Options */}
      {!isInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protection Plan
            </CardTitle>
            <CardDescription>Optional insurance for peace of mind</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedInsurance} onValueChange={setSelectedInsurance} className="space-y-4">
              {INSURANCE_PLANS.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${
                    selectedInsurance === plan.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{plan.name}</h4>
                      <span className="text-lg font-bold">{plan.price === 0 ? "Free" : `$${plan.price}`}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      {selectedPlan && selectedPlan.price > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total Insurance Cost</span>
              <span className="text-2xl text-primary">${selectedPlan.price}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">One-time payment for entire stay duration</p>
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
          I agree to the{" "}
          <a href="/terms" className="underline">
            terms and conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            privacy policy
          </a>
          . I understand this is a request and requires approval from the homeowner.
        </Label>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} className="bg-transparent">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !agreedToTerms} className="flex-1">
          {selectedPlan && selectedPlan.price > 0 ? "Continue to Payment" : "Submit Request"}
        </Button>
      </div>
    </form>
  )
}
