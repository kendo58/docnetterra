import { Shield, Star, Award } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTrustLevel } from "@/lib/utils/trust-score"

interface TrustBadgeProps {
  trustScore: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function TrustBadge({ trustScore, size = "md", showLabel = true }: TrustBadgeProps) {
  const trustInfo = getTrustLevel(trustScore)

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const Icon = trustInfo.level === "superhost" ? Award : trustInfo.level === "trusted" ? Star : Shield

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Icon className={`${sizeClasses[size]} ${trustInfo.color}`} />
            {showLabel && <span className={`text-sm font-medium ${trustInfo.color}`}>{trustInfo.label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{trustInfo.label}</p>
            <p className="text-xs text-muted-foreground">Trust Score: {trustScore}/100</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
