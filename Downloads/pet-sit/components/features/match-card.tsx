"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { MessageCircle, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import { MessageDialog } from "./message-dialog"

interface MatchCardProps {
  match: {
    id: string
    listing: {
      id: string
      title: string
      photos?: string[]
      address?: { city: string; state: string }
    }
    user: {
      id: string
      full_name?: string
      profile_photo_url?: string
      verification_tier?: string
    }
    matched_at: string
    conversation_id?: string | null
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const [messageOpen, setMessageOpen] = useState(false)

  const photo = match.listing.photos?.[0] || "/cozy-cabin-interior.png"
  const profilePhoto = match.user.profile_photo_url || "/abstract-profile.png"

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg">
              <Image src={photo || "/placeholder.svg"} alt={match.listing.title} fill className="object-cover" />
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full">
                    <Image
                      src={profilePhoto || "/placeholder.svg"}
                      alt={match.user.full_name || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{match.user.full_name || "User"}</p>
                    {match.user.verification_tier === "premium" && <BadgeIcon type="premium" className="mt-0.5" />}
                  </div>
                </div>

                <Link href={`/listings/${match.listing.id}`}>
                  <h4 className="font-semibold hover:underline line-clamp-1">{match.listing.title}</h4>
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {match.listing.address?.city}, {match.listing.address?.state}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" className="flex-1 gap-2" onClick={() => setMessageOpen(true)}>
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
                <Link href={`/sits/new?listing=${match.listing.id}`}>
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                    <Calendar className="h-4 w-4" />
                    Request Sit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <MessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        matchId={match.id}
        otherUser={match.user}
        listingTitle={match.listing.title}
        conversationId={match.conversation_id}
      />
    </>
  )
}
