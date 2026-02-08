"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

type MessageInsertPayload = {
  new: {
    sender_id?: string
  }
}

export function useMobileMessageBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)

    if (!conversations || conversations.length === 0) {
      setUnreadCount(0)
      return
    }

    const conversationIds = conversations.map((c) => c.id)

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .eq("is_read", false)

    setUnreadCount(count || 0)
  }, [])

  useEffect(() => {
    fetchUnreadCount()

    const supabase = createBrowserClient()

    async function setupListener() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`mobile-badge-${user.id}`)
        .on("broadcast", { event: "new_message" }, () => {
          setUnreadCount((prev) => prev + 1)
        })
        .subscribe()

      // Also listen for database changes
      const dbChannel = supabase
        .channel(`mobile-badge-db-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const messagePayload = payload as MessageInsertPayload
          if (messagePayload.new.sender_id !== user.id) {
            fetchUnreadCount()
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
          fetchUnreadCount()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
        supabase.removeChannel(dbChannel)
      }
    }

    setupListener()
  }, [fetchUnreadCount])

  return { unreadCount, refetch: fetchUnreadCount }
}

export function MobileMessageBadge() {
  const { unreadCount } = useMobileMessageBadge()

  if (unreadCount === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )
}
