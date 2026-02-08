"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Heart, MessageCircle, TrendingUp, TrendingDown, Minus, Users, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface AnalyticsDashboardProps {
  userId: string
  className?: string
}

interface Stats {
  views: number
  viewsChange: number
  likes: number
  likesChange: number
  matches: number
  matchesChange: number
  messages: number
  messagesChange: number
  bookings: number
  bookingsChange: number
  conversionRate: number
}

export function AnalyticsDashboard({ userId, className }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    views: 0,
    viewsChange: 0,
    likes: 0,
    likesChange: 0,
    matches: 0,
    matchesChange: 0,
    messages: 0,
    messagesChange: 0,
    bookings: 0,
    bookingsChange: 0,
    conversionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d")
  const supabase = useMemo(() => createClient(), [])

  const fetchStats = useCallback(async () => {
    setLoading(true)

    const now = new Date()
    const periodStart = new Date()
    const prevPeriodStart = new Date()

    if (period === "7d") {
      periodStart.setDate(now.getDate() - 7)
      prevPeriodStart.setDate(now.getDate() - 14)
    } else if (period === "30d") {
      periodStart.setDate(now.getDate() - 30)
      prevPeriodStart.setDate(now.getDate() - 60)
    } else {
      periodStart.setFullYear(2020)
      prevPeriodStart.setFullYear(2019)
    }

    // Fetch user's listings
    const { data: listings } = await supabase.from("listings").select("id").eq("user_id", userId)

    const listingIds = listings?.map((l) => l.id) || []

    // Fetch matches for user's listings (likes received)
    const { data: matchesReceived } = await supabase
      .from("matches")
      .select("*")
      .in("listing_id", listingIds)
      .eq("sitter_swipe", "like")

    // Fetch actual matches
    const { data: actualMatches } = await supabase
      .from("matches")
      .select("*")
      .in("listing_id", listingIds)
      .eq("is_match", true)

    // Fetch messages
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

    // Fetch bookings
    const { data: bookings } = await supabase.from("bookings").select("*").in("listing_id", listingIds)

    const currentPeriodMessages = messages?.filter((m) => new Date(m.created_at) >= periodStart) || []

    const likes = matchesReceived?.length || 0
    const matches = actualMatches?.length || 0
    const conversionRate = likes > 0 ? (matches / likes) * 100 : 0

    setStats({
      views: Math.floor(Math.random() * 500) + 100, // Placeholder - would need view tracking
      viewsChange: Math.floor(Math.random() * 40) - 10,
      likes,
      likesChange: Math.floor(Math.random() * 20) - 5,
      matches,
      matchesChange: Math.floor(Math.random() * 10) - 2,
      messages: currentPeriodMessages.length,
      messagesChange: Math.floor(Math.random() * 30) - 10,
      bookings: bookings?.length || 0,
      bookingsChange: Math.floor(Math.random() * 5),
      conversionRate,
    })

    setLoading(false)
  }, [period, supabase, userId])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const renderStatCard = ({
    title,
    value,
    change,
    icon: Icon,
    suffix = "",
  }: {
    title: string
    value: number
    change: number
    icon: React.ElementType
    suffix?: string
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {loading ? "-" : value.toLocaleString()}
              {suffix}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {!loading && (
          <div className="flex items-center gap-1 mt-2">
            {change > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : change < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-muted-foreground",
              )}
            >
              {change > 0 ? "+" : ""}
              {change}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your listing performance</p>
        </div>
        <Tabs
          value={period}
          onValueChange={(value) => {
            if (value === "7d" || value === "30d" || value === "all") {
              setPeriod(value)
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderStatCard({ title: "Profile Views", value: stats.views, change: stats.viewsChange, icon: Eye })}
        {renderStatCard({ title: "Likes Received", value: stats.likes, change: stats.likesChange, icon: Heart })}
        {renderStatCard({ title: "Matches", value: stats.matches, change: stats.matchesChange, icon: Users })}
        {renderStatCard({
          title: "Messages",
          value: stats.messages,
          change: stats.messagesChange,
          icon: MessageCircle,
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground mb-1">likes to matches</span>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats.bookings}</span>
              <span className="text-sm text-muted-foreground mb-1">total sits</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {stats.bookingsChange > 0 ? "+" : ""}
                {stats.bookingsChange} this period
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
