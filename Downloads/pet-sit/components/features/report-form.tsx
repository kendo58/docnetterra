"use client"

import type React from "react"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { Flag, AlertTriangle } from "lucide-react"

interface ReportFormProps {
  reportedUserId: string
  reporterUserId: string
  trigger?: React.ReactNode
}

const reportTypes = [
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or scam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
]

export function ReportForm({ reportedUserId, reporterUserId, trigger }: ReportFormProps) {
  const [open, setOpen] = useState(false)
  const [reportType, setReportType] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reportType) {
      toast.error("Please select a reason for your report")
      return
    }

    if (!description.trim()) {
      toast.error("Please provide a description")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()

      const { error } = await supabase.from("safety_reports").insert({
        reporter_id: reporterUserId,
        reported_user_id: reportedUserId,
        report_type: reportType,
        description: description.trim(),
        status: "pending",
      })

      if (error) throw error

      toast.success("Report submitted successfully")
      setOpen(false)
      setReportType("")
      setDescription("")
    } catch {
      toast.error("Failed to submit report")
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report User
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate behavior. Your report will be reviewed by our
            team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>What's the issue?</Label>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              {reportTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about what happened..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
