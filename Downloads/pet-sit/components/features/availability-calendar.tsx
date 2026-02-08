"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DateRange } from "react-day-picker"
import { format, differenceInDays, addDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CalendarIcon, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface AvailabilityCalendarProps {
  listingId: string
  initialAvailability?: Array<{
    id: string
    start_date: string
    end_date: string
    is_booked: boolean
  }>
  mode?: "edit" | "view"
}

export function AvailabilityCalendar({
  listingId,
  initialAvailability = [],
  mode = "view",
}: AvailabilityCalendarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availabilityData, setAvailabilityData] = useState(initialAvailability)

  // Convert availability data to disabled dates for calendar
  const bookedDates = availabilityData
    .filter((a) => a.is_booked)
    .flatMap((a) => {
      const start = new Date(a.start_date)
      const end = new Date(a.end_date)
      const days = differenceInDays(end, start)
      return Array.from({ length: days + 1 }, (_, i) => addDays(start, i))
    })

  const availableDates = availabilityData
    .filter((a) => !a.is_booked)
    .flatMap((a) => {
      const start = new Date(a.start_date)
      const end = new Date(a.end_date)
      const days = differenceInDays(end, start)
      return Array.from({ length: days + 1 }, (_, i) => addDays(start, i))
    })

  const handleAddAvailability = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("availability")
        .insert({
          listing_id: listingId,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          is_booked: false,
        })
        .select()
        .single()

      if (error) throw error

      setAvailabilityData([...availabilityData, data])
      setDateRange(undefined)
      router.refresh()
    } catch (error) {
      console.error("[sitswap] Error adding availability:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveAvailability = async (id: string) => {
    try {
      const { error } = await supabase.from("availability").delete().eq("id", id)

      if (error) throw error

      setAvailabilityData(availabilityData.filter((a) => a.id !== id))
      router.refresh()
    } catch (error) {
      console.error("[sitswap] Error removing availability:", error)
    }
  }

  return (
    <div className="space-y-6">
      {mode === "edit" ? (
        <Card>
          <CardHeader>
            <CardTitle>Set Your Availability</CardTitle>
            <CardDescription>Select date ranges when you're available for pet sitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {differenceInDays(dateRange.to, dateRange.from) + 1} days selected
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddAvailability} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add Availability
                </Button>
              </div>
            )}

            {availabilityData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Your Available Dates</h4>
                <div className="space-y-2">
                  {availabilityData
                    .filter((a) => !a.is_booked)
                    .map((availability) => (
                      <div
                        key={availability.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {format(new Date(availability.start_date), "MMM d")} -{" "}
                            {format(new Date(availability.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAvailability(availability.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Availability Calendar</CardTitle>
            <CardDescription>See when this sitter is available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-primary" />
                <span className="text-slate-600">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-red-100 border border-red-200" />
                <span className="text-slate-600">Unavailable</span>
              </div>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                disabled={(date) => {
                  const isPast = date < new Date()
                  const isBooked = bookedDates.some((d) => d.toDateString() === date.toDateString())
                  const isAvailable = availableDates.some((d) => d.toDateString() === date.toDateString())
                  return isPast || (!isAvailable && !isBooked)
                }}
                modifiers={{
                  available: availableDates,
                  booked: bookedDates,
                }}
                modifiersClassNames={{
                  available: "bg-green-100 text-green-900 hover:bg-green-200",
                  booked: "bg-red-100 text-red-900 hover:bg-red-200 line-through",
                }}
                numberOfMonths={2}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
