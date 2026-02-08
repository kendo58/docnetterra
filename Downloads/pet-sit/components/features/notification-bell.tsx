"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { markNotificationAsRead } from "@/app/actions/notifications"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/types/database"

function getNotificationUrl(data: Notification["data"]): string | null {
  if (!data || typeof data !== "object") return null
  const url = (data as Record<string, unknown>).url
  return typeof url === "string" && url.length > 0 ? url : null
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    const supabase = createBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications")
        const data = await res.json()
        if (!isMounted) return
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    async function setupRealtime() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user || !isMounted) {
        return
      }

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const incoming = payload.new as Notification
            setNotifications((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev
              const next = [incoming, ...prev]
              setUnreadCount(next.filter((item) => !item.is_read).length)
              return next
            })
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification
            setNotifications((prev) => {
              const next = prev.map((item) => (item.id === updated.id ? updated : item))
              setUnreadCount(next.filter((item) => !item.is_read).length)
              return next
            })
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const removed = payload.old as Notification
            setNotifications((prev) => {
              const next = prev.filter((item) => item.id !== removed.id)
              setUnreadCount(next.filter((item) => !item.is_read).length)
              return next
            })
          },
        )
        .subscribe()
    }

    fetchNotifications()
    setupRealtime()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    setIsOpen(false)

    // Navigate based on notification type
    const notificationUrl = getNotificationUrl(notification.data)
    if (notificationUrl) {
      router.push(notificationUrl)
    }
  }

  const recentNotifications = notifications.slice(0, 5)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={() => router.push("/notifications")}
            >
              View all
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
        ) : (
          <>
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <span className={`font-medium text-sm ${!notification.is_read ? "text-primary" : ""}`}>
                    {notification.title}
                  </span>
                  {!notification.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">{notification.body}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm" onClick={() => router.push("/notifications")}>
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
