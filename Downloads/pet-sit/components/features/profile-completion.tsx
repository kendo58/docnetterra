"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Camera, MapPin, FileText, Shield, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ProfileCompletionProps {
  profile: {
    profile_photo_url?: string | null
    bio?: string | null
    verification_tier?: string | null
    address?: unknown
  } | null
  listings?: Array<{ id: string }>
  className?: string
}

interface CompletionItem {
  id: string
  label: string
  completed: boolean
  icon: React.ElementType
  href: string
  priority: "high" | "medium" | "low"
}

export function ProfileCompletion({ profile, listings = [], className }: ProfileCompletionProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  const completionItems: CompletionItem[] = [
    {
      id: "photo",
      label: "Add profile photo",
      completed: !!profile?.profile_photo_url,
      icon: Camera,
      href: "/profile/edit",
      priority: "high",
    },
    {
      id: "bio",
      label: "Write your bio",
      completed: !!profile?.bio && profile.bio.length > 20,
      icon: FileText,
      href: "/profile/edit",
      priority: "high",
    },
    {
      id: "location",
      label: "Add your location",
      completed: !!profile?.address,
      icon: MapPin,
      href: "/profile/edit",
      priority: "medium",
    },
    {
      id: "verification",
      label: "Verify your identity",
      completed: profile?.verification_tier !== "basic",
      icon: Shield,
      href: "/profile/verify",
      priority: "high",
    },
    {
      id: "listing",
      label: "Create your first listing",
      completed: listings.length > 0,
      icon: Calendar,
      href: "/listings/new",
      priority: "medium",
    },
  ]

  const completedCount = completionItems.filter((item) => item.completed).length
  const totalCount = completionItems.length
  const completionPercentage = Math.round((completedCount / totalCount) * 100)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(completionPercentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [completionPercentage])

  const incompleteItems = completionItems
    .filter((item) => !item.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

  if (completionPercentage === 100) {
    return null
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Your Profile</CardTitle>
          <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={animatedProgress} className="h-2 transition-all duration-1000" />

        <div className="space-y-2">
          {incompleteItems.slice(0, 3).map((item) => (
            <Link key={item.id} href={item.href}>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted hover:border-primary">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    item.priority === "high" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.priority === "high" && <p className="text-xs text-destructive">Recommended</p>}
                </div>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>

        {incompleteItems.length > 3 && (
          <p className="text-center text-sm text-muted-foreground">
            +{incompleteItems.length - 3} more steps to complete
          </p>
        )}
      </CardContent>
    </Card>
  )
}
