import { CheckCircle2, Shield, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BadgeIconProps {
  type: "verified" | "premium" | "superhost"
  className?: string
}

export function BadgeIcon({ type, className }: BadgeIconProps) {
  const badges = {
    verified: {
      icon: CheckCircle2,
      label: "Verified",
      className: "bg-accent text-accent-foreground",
    },
    premium: {
      icon: Shield,
      label: "Premium Verified",
      className: "bg-primary text-primary-foreground",
    },
    superhost: {
      icon: Star,
      label: "Superhost",
      className: "bg-secondary text-secondary-foreground",
    },
  }

  const badge = badges[type]
  const Icon = badge.icon

  return (
    <Badge className={cn("gap-1", badge.className, className)}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{badge.label}</span>
    </Badge>
  )
}
