"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Home, Heart, MessageCircle, Star, UserPlus, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: "listing" | "match" | "message" | "review" | "signup" | "booking"
  user: { full_name: string; profile_photo_url?: string }
  description: string
  created_at: string
}

type ListingActivityRow = {
  id: string
  title: string | null
  created_at: string
  user: {
    full_name: string | null
    profile_photo_url: string | null
  } | null
}

type MatchActivityRow = {
  id: string
  created_at: string
  sitter: {
    full_name: string | null
    profile_photo_url: string | null
  } | null
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      const supabase = createClient()

      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, created_at, user:profiles(full_name, profile_photo_url)")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<ListingActivityRow[]>()

      const { data: matches } = await supabase
        .from("matches")
        .select("id, created_at, sitter:profiles!matches_sitter_id_fkey(full_name, profile_photo_url)")
        .eq("is_match", true)
        .order("matched_at", { ascending: false })
        .limit(3)
        .returns<MatchActivityRow[]>()

      const formattedActivities: ActivityItem[] = []

      listings?.forEach((listing) => {
        if (listing.user) {
          formattedActivities.push({
            id: `listing-${listing.id}`,
            type: "listing",
            user: {
              full_name: listing.user.full_name ?? "User",
              profile_photo_url: listing.user.profile_photo_url ?? undefined,
            },
            description: `created a new listing: "${listing.title ?? "Untitled listing"}"`,
            created_at: listing.created_at,
          })
        }
      })

      matches?.forEach((match) => {
        if (match.sitter) {
          formattedActivities.push({
            id: `match-${match.id}`,
            type: "match",
            user: {
              full_name: match.sitter.full_name ?? "User",
              profile_photo_url: match.sitter.profile_photo_url ?? undefined,
            },
            description: "found a new match!",
            created_at: match.created_at,
          })
        }
      })

      formattedActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setActivities(formattedActivities.slice(0, 8))
      setLoading(false)
    }

    fetchActivity()

    const supabase = createClient()
    const channel = supabase
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings" }, () => fetchActivity())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => fetchActivity())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "listing":
        return <Home className="h-4 w-4" />
      case "match":
        return <Heart className="h-4 w-4" />
      case "message":
        return <MessageCircle className="h-4 w-4" />
      case "review":
        return <Star className="h-4 w-4" />
      case "signup":
        return <UserPlus className="h-4 w-4" />
      case "booking":
        return <Calendar className="h-4 w-4" />
    }
  }

  const getBadgeVariant = (type: ActivityItem["type"]) => {
    switch (type) {
      case "listing":
        return "default"
      case "match":
        return "destructive"
      case "message":
        return "secondary"
      case "review":
        return "outline"
      default:
        return "default"
    }
  }

  const getTypeLabel = (type: ActivityItem["type"]) => {
    switch (type) {
      case "booking":
        return "sit"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 animate-slide-in-right"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.user.profile_photo_url || "/placeholder.svg"} />
                <AvatarFallback>{activity.user.full_name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.full_name}</span>{" "}
                  <span className="text-muted-foreground">{activity.description}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getBadgeVariant(activity.type)} className="h-5 text-xs gap-1">
                    {getIcon(activity.type)}
                    {getTypeLabel(activity.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
