"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { Home, Users, Heart, Star, TrendingUp, MapPin } from "lucide-react"

interface StatsCardsProps {
  stats: {
    totalListings: number
    activeUsers: number
    matches: number
    avgRating: number
    citiesCovered: number
    successfulBookings: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Active Listings",
      value: stats.totalListings,
      icon: Home,
      color: "text-[#5a7ca2]",
      bgColor: "bg-[#e3edf7]",
      trend: "+12%",
    },
    {
      title: "Community Members",
      value: stats.activeUsers,
      icon: Users,
      color: "text-[#4e7d73]",
      bgColor: "bg-[#e1ece8]",
      trend: "+8%",
    },
    {
      title: "Successful Matches",
      value: stats.matches,
      icon: Heart,
      color: "text-[#7f9c92]",
      bgColor: "bg-[#e7efec]",
      trend: "+23%",
    },
    {
      title: "Average Rating",
      value: stats.avgRating,
      icon: Star,
      color: "text-[#b08b5a]",
      bgColor: "bg-[#f3ebe1]",
      suffix: "/5",
      decimals: 1,
    },
    {
      title: "Cities Covered",
      value: stats.citiesCovered,
      icon: MapPin,
      color: "text-[#6b7a76]",
      bgColor: "bg-[#e7ece8]",
      trend: "+5",
    },
    {
      title: "Completed Sits",
      value: stats.successfulBookings,
      icon: TrendingUp,
      color: "text-[#4e7d73]",
      bgColor: "bg-[#e1ece8]",
      trend: "+18%",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <Card
          key={card.title}
          className="card-interactive animate-fade-in-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              {card.trend && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {card.trend}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">
                <AnimatedCounter value={card.value} suffix={card.suffix} duration={1500} />
              </p>
              <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
