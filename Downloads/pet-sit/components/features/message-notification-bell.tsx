"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter, usePathname } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RecentMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_photo?: string
  conversation_id: string
  created_at: string
  is_read: boolean
}

export function MessageNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const notificationRef = useRef<Notification | null>(null)

  const isOnMessagesPage = pathname?.startsWith("/messages")

  const fetchRecentMessages = useCallback(async (supabase: ReturnType<typeof createBrowserClient>, uid: string) => {
    try {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${uid},participant2_id.eq.${uid}`)

      if (!conversations || conversations.length === 0) {
        setRecentMessages([])
        return
      }

      const conversationIds = conversations.map((c) => c.id)

      // Get recent unread messages with sender info
      const { data: messages } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          created_at,
          is_read
        `)
        .in("conversation_id", conversationIds)
        .neq("sender_id", uid)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!messages || messages.length === 0) {
        setRecentMessages([])
        return
      }

      // Get sender profiles
      const senderIds = [...new Set(messages.map((m) => m.sender_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", senderIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      const enrichedMessages: RecentMessage[] = messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        sender_name: profileMap.get(msg.sender_id)?.full_name || "User",
        sender_photo: profileMap.get(msg.sender_id)?.profile_photo_url,
        conversation_id: msg.conversation_id,
        created_at: msg.created_at,
        is_read: msg.is_read,
      }))

      setRecentMessages(enrichedMessages)
    } catch (error) {
      console.error("Failed to fetch recent messages:", error)
    }
  }, [])

  const fetchUnreadCount = useCallback(async (supabase: ReturnType<typeof createBrowserClient>, uid: string) => {
    try {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${uid},participant2_id.eq.${uid}`)

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0)
        return
      }

      const conversationIds = conversations.map((c) => c.id)

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", uid)
        .eq("is_read", false)

      setUnreadCount(count || 0)
    } catch (error) {
      console.error("Failed to fetch unread count:", error)
    }
  }, [])

  const showBrowserNotification = useCallback(
    async (message: {
      id: string
      content: string
      sender_name?: string
      conversation_id: string
    }) => {
      if (!("Notification" in window)) return

      if (Notification.permission === "default") {
        await Notification.requestPermission()
      }

      if (Notification.permission === "granted") {
        notificationRef.current?.close()
        const notification = new Notification("New Message - SitSwap", {
          body: message.sender_name
            ? `${message.sender_name}: ${message.content?.substring(0, 100)}`
            : "You have a new message",
          icon: "/icon-light-32x32.png",
          tag: `message-${message.id}`,
        })

        notificationRef.current = notification
        notification.onclick = () => {
          window.focus()
          router.push(`/messages/${message.conversation_id}`)
          notification.close()
        }
      }
    },
    [router],
  )

  useEffect(() => {
    const supabase = createBrowserClient()
    let cleanup: (() => void) | undefined

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      await fetchUnreadCount(supabase, user.id)
      await fetchRecentMessages(supabase, user.id)

      const notificationChannel = supabase
        .channel(`user-notifications-${user.id}`)
        .on("broadcast", { event: "new_message" }, async (payload) => {
          console.log("[sitswap] Notification bell received broadcast:", payload)
          const message = payload.payload as {
            id: string
            content: string
            sender_id: string
            conversation_id: string
            created_at: string
          }

          // Increment unread count
          setUnreadCount((prev) => prev + 1)

          // Get sender name for notification
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", message.sender_id)
            .single()

          const newMessage: RecentMessage = {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            sender_name: sender?.full_name || "User",
            sender_photo: sender?.profile_photo_url,
            conversation_id: message.conversation_id,
            created_at: message.created_at,
            is_read: false,
          }
          setRecentMessages((prev) => [newMessage, ...prev.slice(0, 4)])

          window.dispatchEvent(
            new CustomEvent("new-message-received", {
              detail: {
                conversation_id: message.conversation_id,
                message: newMessage,
              },
            }),
          )

          // Show toast if not on messages page or not in that specific conversation
          const currentPath = window.location.pathname
          const isInConversation = currentPath === `/messages/${message.conversation_id}`

          if (!isInConversation) {
            toast({
              title: "New Message",
              description: sender?.full_name
                ? `${sender.full_name}: ${message.content?.substring(0, 50)}${message.content?.length > 50 ? "..." : ""}`
                : "You have a new message",
              duration: 5000,
              action: (
                <Button variant="outline" size="sm" onClick={() => router.push(`/messages/${message.conversation_id}`)}>
                  View
                </Button>
              ),
            })

            // Play notification sound
            playNotificationSound()

            // Show browser notification
            showBrowserNotification({
              id: message.id,
              content: message.content,
              sender_name: sender?.full_name,
              conversation_id: message.conversation_id,
            })
          }
        })
        .subscribe((status) => {
          console.log("[sitswap] Notification channel status:", status)
        })

      cleanup = () => {
        supabase.removeChannel(notificationChannel)
      }
    }

    init()

    return () => {
      cleanup?.()
    }
  }, [fetchUnreadCount, fetchRecentMessages, toast, router, showBrowserNotification])

  useEffect(() => {
    if (isOnMessagesPage && userId) {
      const timer = setTimeout(() => {
        const supabase = createBrowserClient()
        fetchUnreadCount(supabase, userId)
        fetchRecentMessages(supabase, userId)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOnMessagesPage, userId, fetchUnreadCount, fetchRecentMessages])

  function playNotificationSound() {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }

  const handleMessageClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`)
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button
          variant={isOnMessagesPage ? "default" : "ghost"}
          size="icon"
          className="relative"
          onClick={() => router.push("/messages")}
        >
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs animate-pulse"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Messages</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>

        {recentMessages.length > 0 ? (
          <ScrollArea className="max-h-72">
            <div className="divide-y">
              {recentMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleMessageClick(msg.conversation_id)}
                  className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex gap-3 items-start"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={msg.sender_photo || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{msg.sender_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                  </div>
                  {!msg.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No unread messages</p>
          </div>
        )}

        <div className="p-2 border-t bg-muted/30">
          <Button variant="ghost" className="w-full text-sm h-8" onClick={() => router.push("/messages")}>
            View all messages
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
