import { Badge } from "@/components/ui/badge"
import { Shield, Phone, Mail, Award as IdCard } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VerificationBadgesProps {
  verifications: {
    emailVerified?: boolean
    phoneVerified?: boolean
    identityVerified?: boolean
    backgroundCheckPassed?: boolean
  }
  size?: "sm" | "md"
}

export function VerificationBadges({ verifications, size = "md" }: VerificationBadgesProps) {
  const badges = [
    {
      key: "email",
      icon: Mail,
      label: "Email Verified",
      verified: verifications.emailVerified,
    },
    {
      key: "phone",
      icon: Phone,
      label: "Phone Verified",
      verified: verifications.phoneVerified,
    },
    {
      key: "identity",
      icon: IdCard,
      label: "ID Verified",
      verified: verifications.identityVerified,
    },
    {
      key: "background",
      icon: Shield,
      label: "Background Check",
      verified: verifications.backgroundCheckPassed,
    },
  ]

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon
          if (!badge.verified) return null

          return (
            <Tooltip key={badge.key}>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
                  <Icon className={iconSize} />
                  {size === "md" && <span>{badge.label}</span>}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{badge.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
