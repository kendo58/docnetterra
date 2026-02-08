"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js"

export interface ChatMessage {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
  status?: "sending" | "sent" | "delivered" | "read"
  sender?: {
    full_name: string
    profile_photo_url?: string
  }
}

type SenderRow = {
  full_name: string | null
  profile_photo_url: string | null
}

type MessageRow = {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
  sender: SenderRow | SenderRow[] | null
}

function normalizeSender(sender: SenderRow | SenderRow[] | null | undefined): ChatMessage["sender"] | undefined {
  if (!sender) return undefined
  const normalized = Array.isArray(sender) ? sender[0] : sender
  if (!normalized) return undefined
  return {
    full_name: normalized.full_name ?? "User",
    profile_photo_url: normalized.profile_photo_url ?? undefined,
  }
}

interface UseSupabaseChatOptions {
  conversationId: string
  currentUserId: string
  recipientId: string
  onNewMessage?: (message: ChatMessage) => void
}

interface TypingUser {
  userId: string
  timestamp: number
}

export function useSupabaseChat({ conversationId, currentUserId, recipientId, onNewMessage }: UseSupabaseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [authError, setAuthError] = useState(false)

  const supabase = createBrowserClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const dbChannelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingBroadcast = useRef<number>(0)
  const mountedRef = useRef(true)
  const optimisticIdsRef = useRef<Set<string>>(new Set())

  // Validate session
  const validateSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error || !session) {
        setAuthError(true)
        return false
      }
      setAuthError(false)
      return true
    } catch {
      setAuthError(true)
      return false
    }
  }, [supabase])

  // Fetch messages from database - the source of truth
  const fetchMessages = useCallback(async () => {
    if (!mountedRef.current) return []

    try {
      const isValid = await validateSession()
      if (!isValid) {
        setIsLoading(false)
        return []
      }

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at,
          is_read,
          sender:profiles!sender_id(full_name, profile_photo_url)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[sitswap] Error fetching messages:", error)
        if (error.message?.includes("session") || error.code === "PGRST301") {
          setAuthError(true)
        }
        return []
      }

      const rows = (data as MessageRow[] | null) ?? []
      const dbMessages: ChatMessage[] = rows.map((msg) => ({
        ...msg,
        sender: normalizeSender(msg.sender),
        status: msg.is_read ? "read" : ("delivered" as const),
      }))

      if (mountedRef.current) {
        // Clear optimistic IDs that are now in database
        const dbIds = new Set(dbMessages.map((m) => m.id))
        optimisticIdsRef.current.forEach((id) => {
          if (dbIds.has(id)) {
            optimisticIdsRef.current.delete(id)
          }
        })

        setMessages(dbMessages)
        setIsLoading(false)
      }

      return dbMessages
    } catch (error) {
      console.error("[sitswap] Failed to fetch messages:", error)
      if (mountedRef.current) {
        setIsLoading(false)
      }
      return []
    }
  }, [conversationId, supabase, validateSession])

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    try {
      const unreadIds = messages
        .filter((m) => !m.is_read && m.sender_id !== currentUserId && !m.id.startsWith("temp-"))
        .map((m) => m.id)

      if (unreadIds.length === 0) return

      await supabase.from("messages").update({ is_read: true }).in("id", unreadIds)

      // Broadcast read receipt for real-time update
      channelRef.current?.send({
        type: "broadcast",
        event: "read_receipt",
        payload: { messageIds: unreadIds, readBy: currentUserId },
      })

      setMessages((prev) =>
        prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true, status: "read" as const } : m)),
      )
    } catch (error) {
      console.error("[sitswap] Failed to mark messages as read:", error)
    }
  }, [messages, currentUserId, supabase])

  // Send message - saves to database first, then broadcasts
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return null

      const tempId = `temp-${Date.now()}`
      const optimisticMessage: ChatMessage = {
        id: tempId,
        content: content.trim(),
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        is_read: false,
        status: "sending",
      }

      // Add optimistic message
      setMessages((prev) => [...prev, optimisticMessage])

      try {
        // Get sender profile
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name, profile_photo_url")
          .eq("id", currentUserId)
          .single()

        // Insert into database - this is the source of truth
        const { data: newMsg, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            receiver_id: recipientId,
            content: content.trim(),
            is_read: false,
          })
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read,
            sender:profiles!sender_id(full_name, profile_photo_url)
          `)
          .single()

        if (error) throw error

        console.log("[sitswap] Message saved to database:", newMsg.id)

        // Track this ID to prevent duplicate from database listener
        optimisticIdsRef.current.add(newMsg.id)

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId)

        // Replace optimistic message with real one
        const insertedMessage = newMsg as MessageRow
        const finalMessage: ChatMessage = {
          ...insertedMessage,
          sender: normalizeSender(
            senderProfile
              ? {
                  full_name: senderProfile.full_name ?? "User",
                  profile_photo_url: senderProfile.profile_photo_url ?? null,
                }
              : insertedMessage.sender,
          ),
          status: "sent" as const,
        }
        setMessages((prev) => prev.map((m) => (m.id === tempId ? finalMessage : m)))

        try {
          channelRef.current?.send({
            type: "broadcast",
            event: "new_message",
            payload: {
              id: newMsg.id,
              content: newMsg.content,
              sender_id: currentUserId,
              created_at: newMsg.created_at,
              sender: senderProfile,
            },
          })
          console.log("[sitswap] Broadcasted message to conversation channel")
        } catch (e) {
          console.error("[sitswap] Failed to broadcast to conversation:", e)
        }

        try {
          const notificationChannel = supabase.channel(`user-notifications-${recipientId}`)
          await notificationChannel.subscribe()
          await notificationChannel.send({
            type: "broadcast",
            event: "new_message",
            payload: {
              id: newMsg.id,
              content: newMsg.content,
              sender_id: currentUserId,
              sender_name: senderProfile?.full_name || "Someone",
              conversation_id: conversationId,
              created_at: newMsg.created_at,
            },
          })
          supabase.removeChannel(notificationChannel)
          console.log("[sitswap] Broadcasted to recipient notification channel")
        } catch (e) {
          console.error("[sitswap] Failed to send notification:", e)
        }

        return finalMessage
      } catch (error) {
        console.error("[sitswap] Failed to send message:", error)
        // Remove failed optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        return null
      }
    },
    [conversationId, currentUserId, recipientId, supabase],
  )

  // Typing indicators
  const sendTypingIndicator = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingBroadcast.current < 1000) return
    lastTypingBroadcast.current = now
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, timestamp: now },
    })
  }, [currentUserId])

  const stopTyping = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: currentUserId },
    })
  }, [currentUserId])

  // Main effect - setup channels and listeners
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    mountedRef.current = true
    setMessages([])
    setIsLoading(true)
    setIsConnected(false)
    setAuthError(false)
    optimisticIdsRef.current.clear()

    let pollingInterval: ReturnType<typeof setInterval> | null = null

    const initializeChat = async () => {
      console.log("[sitswap] Initializing chat for conversation:", conversationId)

      const isValid = await validateSession()
      if (!isValid || !mountedRef.current) {
        console.log("[sitswap] Session invalid or unmounted")
        setIsLoading(false)
        return
      }

      // Fetch initial messages from database
      console.log("[sitswap] Fetching initial messages")
      await fetchMessages()

      if (!mountedRef.current) return

      // Channel for broadcast events (typing, presence, read receipts)
      const broadcastChannel = supabase.channel(`chat:${conversationId}`, {
        config: {
          presence: { key: currentUserId },
          broadcast: { self: false },
        },
      })

      channelRef.current = broadcastChannel

      // Handle typing indicators
      broadcastChannel.on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!mountedRef.current || payload.userId === currentUserId) return
        setTypingUsers((prev) => {
          const filtered = prev.filter((t) => t.userId !== payload.userId)
          return [...filtered, { userId: payload.userId, timestamp: payload.timestamp }]
        })
      })

      broadcastChannel.on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        if (!mountedRef.current) return
        setTypingUsers((prev) => prev.filter((t) => t.userId !== payload.userId))
      })

      // Handle read receipts
      broadcastChannel.on("broadcast", { event: "read_receipt" }, ({ payload }) => {
        if (!mountedRef.current || payload.readBy === currentUserId) return
        setMessages((prev) =>
          prev.map((m) => (payload.messageIds.includes(m.id) ? { ...m, is_read: true, status: "read" as const } : m)),
        )
      })

      broadcastChannel.on("broadcast", { event: "new_message" }, ({ payload }) => {
        if (!mountedRef.current) return
        console.log("[sitswap] Received broadcast new_message:", payload.id)

        // Skip our own messages
        if (payload.sender_id === currentUserId) return

        // Add message if not already present
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev

          const newMessage: ChatMessage = {
            id: payload.id,
            content: payload.content,
            sender_id: payload.sender_id,
            created_at: payload.created_at,
            is_read: false,
            status: "delivered",
            sender: normalizeSender(payload.sender as SenderRow | SenderRow[] | null),
          }

          onNewMessage?.(newMessage)

          const updated = [...prev, newMessage]
          updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          return updated
        })
      })

      // Handle presence
      broadcastChannel.on("presence", { event: "sync" }, () => {
        if (!mountedRef.current) return
        const state = broadcastChannel.presenceState()
        setOnlineUsers(Object.keys(state))
      })

      broadcastChannel.on("presence", { event: "join" }, ({ key }) => {
        if (!mountedRef.current) return
        setOnlineUsers((prev) => (prev.includes(key) ? prev : [...prev, key]))
      })

      broadcastChannel.on("presence", { event: "leave" }, ({ key }) => {
        if (!mountedRef.current) return
        setOnlineUsers((prev) => prev.filter((u) => u !== key))
        setTypingUsers((prev) => prev.filter((t) => t.userId !== key))
      })

      broadcastChannel.subscribe(async (status) => {
        if (!mountedRef.current) return
        console.log("[sitswap] Broadcast channel status:", status)
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          await broadcastChannel.track({ online_at: new Date().toISOString() })
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false)
        }
      })

      // Database change listener for new messages
      const dbChannel = supabase
        .channel(`db-messages-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
            if (!mountedRef.current) return

            console.log("[sitswap] Database INSERT detected:", payload.new)

            const newMessage = payload.new as {
              id: string
              content: string
              sender_id: string
              created_at: string
              is_read: boolean
            }

            // Skip if this is our own optimistic message
            if (optimisticIdsRef.current.has(newMessage.id)) {
              console.log("[sitswap] Skipping optimistic message:", newMessage.id)
              optimisticIdsRef.current.delete(newMessage.id)
              return
            }

            // Skip if we already have this message
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                console.log("[sitswap] Message already exists:", newMessage.id)
                return prev
              }

              console.log("[sitswap] Adding new message from DB listener:", newMessage.id)

              const messageWithSender: ChatMessage = {
                ...newMessage,
                status: "delivered",
              }

              // Call onNewMessage callback
              if (newMessage.sender_id !== currentUserId) {
                onNewMessage?.(messageWithSender)
              }

              const updated = [...prev, messageWithSender]
              updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              return updated
            })

            // Fetch full message with sender info
            const { data } = await supabase
              .from("messages")
              .select(`
                id,
                content,
                sender_id,
                created_at,
                is_read,
                sender:profiles!sender_id(full_name, profile_photo_url)
              `)
              .eq("id", newMessage.id)
              .single()

            if (data && mountedRef.current) {
              const normalized: ChatMessage = {
                ...(data as MessageRow),
                sender: normalizeSender((data as MessageRow).sender),
                status: "delivered" as const,
              }
              setMessages((prev) => prev.map((m) => (m.id === normalized.id ? normalized : m)))
            }
          },
        )
        .subscribe((status) => {
          console.log("[sitswap] DB channel status:", status)
        })

      dbChannelRef.current = dbChannel

      pollingInterval = setInterval(async () => {
        if (!mountedRef.current) return
        console.log("[sitswap] Polling for new messages")

        const { data, error } = await supabase
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read,
            sender:profiles!sender_id(full_name, profile_photo_url)
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (error || !data || !mountedRef.current) return

        setMessages((prev) => {
          const rows = data as MessageRow[]
          // Get all message IDs we currently have
          const existingIds = new Set(prev.map((m) => m.id))

          // Find new messages from the database
          const newMessages = rows.filter((m) => !existingIds.has(m.id))

          if (newMessages.length === 0) return prev

          console.log("[sitswap] Found", newMessages.length, "new messages via polling")

          // Notify about new messages from others
          newMessages.forEach((msg) => {
            if (msg.sender_id !== currentUserId) {
              onNewMessage?.({ ...msg, sender: normalizeSender(msg.sender), status: "delivered" })
            }
          })

          // Merge with existing, keeping optimistic messages
          const optimisticMessages = prev.filter((m) => m.id.startsWith("temp-"))
          const dbMessages: ChatMessage[] = rows.map((m) => ({
            ...m,
            sender: normalizeSender(m.sender),
            status: m.is_read ? "read" : ("delivered" as const),
          }))
          const merged = [...dbMessages, ...optimisticMessages]
          merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

          return merged
        })
      }, 3000)
    }

    initializeChat()

    // Cleanup typing indicators
    const typingCleanup = setInterval(() => {
      if (mountedRef.current) {
        const now = Date.now()
        setTypingUsers((prev) => prev.filter((t) => now - t.timestamp < 3000))
      }
    }, 1000)

    return () => {
      mountedRef.current = false
      clearInterval(typingCleanup)
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (dbChannelRef.current) {
        dbChannelRef.current.unsubscribe()
        dbChannelRef.current = null
      }
    }
  }, [conversationId, currentUserId, supabase, validateSession, fetchMessages, onNewMessage])

  const isRecipientTyping = typingUsers.some((t) => t.userId === recipientId)
  const isRecipientOnline = onlineUsers.includes(recipientId)

  return {
    messages,
    isLoading,
    isConnected,
    isRecipientTyping,
    isRecipientOnline,
    sendMessage,
    sendTypingIndicator,
    stopTyping,
    markAsRead,
    refetch: fetchMessages,
    authError,
  }
}
