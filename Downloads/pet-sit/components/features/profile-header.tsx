import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { MapPin, Calendar, CheckCircle } from "lucide-react"
import type { Profile } from "@/lib/types/database"
import { TrustBadge } from "@/components/features/trust-badge"
import { VerificationBadges } from "@/components/features/verification-badges"

interface ProfileHeaderProps {
  profile: Profile & {
    address?: { city: string; state: string }
  }
  reviewCount?: number
  averageRating?: number
  trustScore?: number
  verifications?: {
    emailVerified?: boolean
    phoneVerified?: boolean
    identityVerified?: boolean
    backgroundCheckPassed?: boolean
  }
}

export function ProfileHeader({
  profile,
  reviewCount = 0,
  averageRating = 0,
  trustScore,
  verifications,
}: ProfileHeaderProps) {
  const photo = profile.profile_photo_url || "/abstract-profile.png"

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background">
          <Image src={photo || "/placeholder.svg"} alt={profile.full_name || "User"} fill className="object-cover" />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.full_name || "User"}</h1>
              {trustScore !== undefined && <TrustBadge trustScore={trustScore} size="md" showLabel={false} />}
            </div>
            {profile.address && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {profile.address.city}, {profile.address.state}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.verification_tier === "premium" && <BadgeIcon type="premium" />}
            {profile.verification_tier === "enhanced" && <BadgeIcon type="verified" />}
            {profile.user_type && (
              <Badge variant="secondary" className="capitalize">
                {profile.user_type}
              </Badge>
            )}
          </div>

          {verifications && <VerificationBadges verifications={verifications} size="sm" />}

          {reviewCount > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {new Date(profile.created_at).getFullYear()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}
    </div>
  )
}
