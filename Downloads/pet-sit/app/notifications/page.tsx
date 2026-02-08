import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { getNotifications, markAllNotificationsAsRead, deleteNotification } from "@/app/actions/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Bell, Trash2, ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navigation/navbar"
import { NotificationsLiveRefresh } from "@/components/features/notifications-live-refresh"

async function handleMarkAllRead() {
  "use server"
  await markAllNotificationsAsRead()
}

async function handleDelete(notificationId: string) {
  "use server"
  await deleteNotification(notificationId)
}

export default async function NotificationsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const notifications = await getNotifications()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <Navbar />
      <NotificationsLiveRefresh userId={user.id} />
      <div className="min-h-screen bg-muted/30 pb-20 pt-20 md:pb-8">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm">
                Messages
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
          </div>

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-muted-foreground mt-2">
                  You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <form action={handleMarkAllRead}>
                <Button variant="outline" size="sm">
                  Mark all as read
                </Button>
              </form>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground text-center">{"We'll notify you when there's something new"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className={!notification.is_read ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!notification.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge variant="outline" className="ml-auto">
                            {notification.type.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.body}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                          {notification.data?.url && (
                            <Link href={notification.data.url} className="text-xs text-primary hover:underline">
                              View details
                            </Link>
                          )}
                        </div>
                      </div>
                      <form action={handleDelete.bind(null, notification.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
