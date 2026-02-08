"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type BookingRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: {
    status?: string
  }
}

export function LiveNotifications({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!userId) return

    const supabase = createClient()

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=neq.${userId}`,
        },
        () => {
          toast({
            title: "New Message",
            description: "You have received a new message",
            duration: 5000,
          })
        },
      )
      .subscribe()

    // Subscribe to new matches
    const matchesChannel = supabase
      .channel(`matches-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `is_match=eq.true`,
        },
        () => {
          toast({
            title: "New Match!",
            description: "You have a new match! Start a conversation.",
            duration: 5000,
          })
        },
      )
      .subscribe()

    // Subscribe to sit (booking) updates
    const bookingsChannel = supabase
      .channel(`bookings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const bookingPayload = payload as BookingRealtimePayload
          if (bookingPayload.eventType === "INSERT") {
            toast({
              title: "New Sit Request",
              description: "Someone requested a sit for your listing!",
              duration: 5000,
            })
          } else if (
            bookingPayload.eventType === "UPDATE" &&
            ["confirmed", "accepted"].includes(bookingPayload.new.status ?? "")
          ) {
            toast({
              title: "Sit Confirmed",
              description: "Your sit is confirmed!",
              duration: 5000,
            })
          } else if (bookingPayload.eventType === "UPDATE" && bookingPayload.new.status === "cancelled") {
            toast({
              title: "Sit Cancelled",
              description: "A sit was cancelled. Check your notifications for details.",
              duration: 5000,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(bookingsChannel)
    }
  }, [userId, toast])

  // This component doesn't render anything visible
  return null
}
