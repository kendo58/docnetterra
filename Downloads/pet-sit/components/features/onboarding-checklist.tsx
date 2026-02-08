"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Circle, ChevronRight, X } from "lucide-react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"

interface ChecklistItem {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem("onboarding-dismissed")
    if (isDismissed) {
      setDismissed(true)
      return
    }

    checkProgress()
  }, [])

  async function checkProgress() {
    try {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const [profileRes, listingRes, sitterRes] = await Promise.all([
        supabase.from("profiles").select("bio, profile_photo_url").eq("id", user.id).maybeSingle(),
        supabase.from("listings").select("id").eq("user_id", user.id).limit(1),
        supabase.from("sitter_profiles").select("id").eq("user_id", user.id).maybeSingle(),
      ])

      const hasProfile = !!(profileRes.data?.bio && profileRes.data?.profile_photo_url)
      const hasListing = (listingRes.data?.length ?? 0) > 0
      const hasSitterProfile = !!sitterRes.data

      setItems([
        {
          id: "profile",
          title: "Complete Your Profile",
          description: "Add a bio and profile photo",
          href: "/profile/edit",
          completed: hasProfile,
        },
        {
          id: "listing",
          title: "Create a Listing",
          description: "Share your home and pets",
          href: "/listings/new",
          completed: hasListing,
        },
        {
          id: "sitter",
          title: "Become a Sitter",
          description: "Add your experience and skills",
          href: "/profile/edit",
          completed: hasSitterProfile,
        },
        {
          id: "verify",
          title: "Verify Your Identity",
          description: "Build trust with ID verification",
          href: "/profile/verify",
          completed: false,
        },
      ])
    } catch (error) {
      console.error("Error checking onboarding progress:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem("onboarding-dismissed", "true")
    setDismissed(true)
  }

  if (dismissed || loading) return null

  const completedCount = items.filter((item) => item.completed).length
  const allCompleted = completedCount === items.length

  if (allCompleted) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="relative pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="text-lg">Get Started with SitSwap</CardTitle>
        <CardDescription>
          {completedCount} of {items.length} completed
        </CardDescription>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {items.map((item) => (
          <Link key={item.id} href={item.href}>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
