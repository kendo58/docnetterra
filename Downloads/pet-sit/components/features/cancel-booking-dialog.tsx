"use client"

import { useState, useTransition } from "react"
import type { ComponentProps } from "react"
import { Ban, Loader2 } from "lucide-react"
import { cancelBooking } from "@/app/actions/bookings"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

const CANCELLATION_REASONS = [
  "Change of plans",
  "Found another sit or stay",
  "Schedule conflict",
  "Listing no longer needed",
  "Concern about fit or safety",
  "Other",
]

type CancelBookingDialogProps = {
  bookingId: string
  listingTitle?: string | null
  otherUserName?: string | null
  buttonLabel?: string
  buttonVariant?: ComponentProps<typeof Button>["variant"]
  buttonSize?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function CancelBookingDialog({
  bookingId,
  listingTitle,
  otherUserName,
  buttonLabel = "Cancel",
  buttonVariant = "outline",
  buttonSize = "sm",
  className,
}: CancelBookingDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOther = reason === "Other"

  const handleSubmit = () => {
    setError(null)

    if (!reason) {
      setError("Please select a cancellation reason.")
      return
    }

    if (isOther && !details.trim()) {
      setError("Please add a short note for the cancellation.")
      return
    }

    const formData = new FormData()
    formData.append("booking_id", bookingId)
    formData.append("reason", reason)
    if (details.trim()) {
      formData.append("details", details.trim())
    }

    startTransition(async () => {
      const result = await cancelBooking(formData)
      if (result?.error) {
        setError(result.error)
        return
      }

      toast({
        title: "Cancellation submitted",
        description: "We have notified the other party and started the refund process.",
      })
      setOpen(false)
      setReason("")
      setDetails("")
    })
  }

  const contextLine = listingTitle
    ? `You are cancelling the sit for ${listingTitle}.`
    : "You are cancelling this sit."

  const counterpartLine = otherUserName ? `We will notify ${otherUserName}.` : "We will notify the other party."
  const refundLine = "Service fees and points will be refunded automatically."

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Ban className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this sit</DialogTitle>
            <DialogDescription>
              {contextLine} {counterpartLine} {refundLine}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Why are you cancelling?</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {CANCELLATION_REASONS.map((item) => {
                  const itemId = `cancel-${item.replace(/\s+/g, "-").toLowerCase()}`
                  return (
                    <div key={item} className="flex items-center space-x-2">
                      <RadioGroupItem value={item} id={itemId} />
                      <Label htmlFor={itemId} className="text-sm font-normal">
                        {item}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-details">Add a short note (optional)</Label>
              <Textarea
                id="cancel-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Add any context you want the other party to see"
                className="min-h-[100px]"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)} type="button">
              Keep sit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !reason || (isOther && !details.trim())}
              type="button"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
