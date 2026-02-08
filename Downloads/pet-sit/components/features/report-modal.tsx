"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Flag, AlertTriangle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ReportModalProps {
  reportedUserId?: string
  reportedListingId?: string
  trigger?: React.ReactNode
}

const REPORT_TYPES = [
  { value: "spam", label: "Spam or fake content" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "scam", label: "Suspected scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "fake_listing", label: "Fake or misleading listing" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
]

export function ReportModal({ reportedUserId, reportedListingId, trigger }: ReportModalProps) {
  const [open, setOpen] = useState(false)
  const [reportType, setReportType] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createBrowserClient()

  const handleSubmit = async () => {
    if (!reportType || !description) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to submit a report")
        return
      }

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_listing_id: reportedListingId || null,
        report_type: reportType,
        description,
      })

      if (error) throw error

      toast.success("Report submitted successfully. We'll review it shortly.")
      setOpen(false)
      setReportType("")
      setDescription("")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content or behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>What are you reporting?</Label>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              {REPORT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Please describe the issue</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
