"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProgressSteps } from "@/components/ui/progress-steps"
import { format, differenceInDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CalendarDays, MessageSquare, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { notifyBookingRequest } from "@/app/actions/booking-notifications"

type BookingWizardListing = {
  id: string
  title: string
  user_id: string
  user?: { id?: string | null } | null
}

interface BookingWizardProps {
  listing: BookingWizardListing
  currentUserId: string
  existingAvailability?: Array<{
    start_date: string
    end_date: string
    is_booked: boolean
  }>
  onComplete?: () => void
  onCancel?: () => void
}

const steps = [
  { id: "dates", title: "Select Dates", description: "Choose your stay dates" },
  { id: "message", title: "Introduction", description: "Introduce yourself" },
  { id: "confirm", title: "Confirm", description: "Review and submit" },
]

export function BookingWizard({
  listing,
  currentUserId,
  existingAvailability = [],
  onComplete,
  onCancel,
}: BookingWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate booked dates
  const bookedDates = existingAvailability
    .filter((a) => a.is_booked)
    .flatMap((a) => {
      const start = new Date(a.start_date)
      const end = new Date(a.end_date)
      const days = differenceInDays(end, start)
      return Array.from({ length: days + 1 }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        return date
      })
    })

  const handleNext = () => {
    if (currentStep === 0 && (!dateRange?.from || !dateRange?.to)) {
      toast({
        title: "Please select dates",
        description: "Choose your check-in and check-out dates",
        variant: "destructive",
      })
      return
    }
    if (currentStep === 1 && message.length < 50) {
      toast({
        title: "Please write a longer introduction",
        description: "Your message should be at least 50 characters",
        variant: "destructive",
      })
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    const listingOwnerId = listing?.user_id ?? listing?.user?.id
    if (listingOwnerId && listingOwnerId === currentUserId) {
      toast({
        title: "Can't request your own listing",
        description: "Choose a different listing to request a sit.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create booking request
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          listing_id: listing.id,
          sitter_id: currentUserId,
          homeowner_id: listing.user_id,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          status: "pending",
          message: message,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Create notification for homeowner
      const notificationResult = await notifyBookingRequest(booking.id)
      if (notificationResult?.error) {
        console.warn("[sitswap] Failed to send booking request notification:", notificationResult.error)
      }

      toast({
        title: "Request Sent!",
        description: "The homeowner will review your request and respond soon.",
      })

      onComplete?.()
      router.push(`/sits/${booking.id}`)
    } catch (error) {
      console.error("[sitswap] Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to submit sit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nightCount = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Request a Sit</CardTitle>
        <CardDescription>{listing.title}</CardDescription>
        <ProgressSteps steps={steps} currentStep={currentStep} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Select Dates */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CalendarDays className="h-5 w-5 text-primary" />
              Select Your Dates
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                disabled={(date) =>
                  date < new Date() || bookedDates.some((d) => d.toDateString() === date.toDateString())
                }
                numberOfMonths={2}
                className="rounded-md border"
              />
            </div>
            {dateRange?.from && dateRange?.to && (
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="font-medium">
                  {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nightCount} night{nightCount !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Introduction Message */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <MessageSquare className="h-5 w-5 text-primary" />
              Introduce Yourself
            </div>
            <p className="text-sm text-muted-foreground">
              Tell the homeowner about yourself, your experience, and why you'd be a great fit for their listing.
            </p>
            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'm interested in your listing. Let me tell you a bit about myself..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length} / 50 minimum characters</p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle className="h-5 w-5 text-primary" />
              Review Your Request
            </div>
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Listing</span>
                <span className="font-medium">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dates</span>
                <span className="font-medium">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {nightCount} night{nightCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Your message:</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={currentStep === 0 ? onCancel : handleBack}
            disabled={isSubmitting}
            className={cn(currentStep === 0 && !onCancel && "invisible")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
