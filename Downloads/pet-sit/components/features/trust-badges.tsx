"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Shield, CheckCircle2, Star, Clock, MessageCircle, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrustBadgesProps {
  verificationTier?: string
  responseTime?: number // in hours
  reviewCount?: number
  averageRating?: number
  completedBookings?: number
  memberSince?: string
  className?: string
  compact?: boolean
}

export function TrustBadges({
  verificationTier,
  responseTime,
  reviewCount = 0,
  averageRating = 0,
  completedBookings = 0,
  memberSince: _memberSince,
  className,
  compact = false,
}: TrustBadgesProps) {
  const badges = []

  // Verification badge
  if (verificationTier === "premium") {
    badges.push({
      icon: Shield,
      label: "Premium Verified",
      description: "Identity and background verified",
      color: "bg-amber-500 text-white",
    })
  } else if (verificationTier === "enhanced") {
    badges.push({
      icon: CheckCircle2,
      label: "Verified",
      description: "Identity verified",
      color: "bg-blue-500 text-white",
    })
  }

  // Response time badge
  if (responseTime !== undefined && responseTime <= 1) {
    badges.push({
      icon: Clock,
      label: "Quick Responder",
      description: "Usually responds within 1 hour",
      color: "bg-green-500 text-white",
    })
  } else if (responseTime !== undefined && responseTime <= 24) {
    badges.push({
      icon: MessageCircle,
      label: "Responsive",
      description: "Usually responds within 24 hours",
      color: "bg-emerald-500 text-white",
    })
  }

  // Rating badge
  if (averageRating >= 4.8 && reviewCount >= 5) {
    badges.push({
      icon: Star,
      label: "Top Rated",
      description: `${averageRating.toFixed(1)} average from ${reviewCount} reviews`,
      color: "bg-purple-500 text-white",
    })
  } else if (averageRating >= 4.5 && reviewCount >= 3) {
    badges.push({
      icon: Star,
      label: "Highly Rated",
      description: `${averageRating.toFixed(1)} average rating`,
      color: "bg-indigo-500 text-white",
    })
  }

  // Experience badge
  if (completedBookings >= 10) {
    badges.push({
      icon: Award,
      label: "Experienced",
      description: `${completedBookings}+ completed stays`,
      color: "bg-orange-500 text-white",
    })
  }

  if (badges.length === 0) return null

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {badges.slice(0, compact ? 2 : badges.length).map((badge, index) => (
          <Tooltip key={index}>
            <TooltipTrigger>
              <Badge className={cn("gap-1 cursor-help", badge.color)}>
                <badge.icon className="h-3 w-3" />
                {!compact && <span>{badge.label}</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{badge.label}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {compact && badges.length > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{badges.length - 2}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  )
}
