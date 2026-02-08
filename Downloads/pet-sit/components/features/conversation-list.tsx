"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle } from "lucide-react"

type ConversationUser = {
  full_name: string | null
  profile_photo_url: string | null
}

type ConversationListing = {
  title: string | null
  photos: string[] | null
}

type ConversationMessage = {
  sender_id: string
  content: string
  created_at: string
}

type ConversationItem = {
  id: string
  otherUser: ConversationUser | null
  listing?: ConversationListing | null
  lastMessage?: ConversationMessage | null
  unreadCount?: number | null
  last_message_at?: string | null
}

interface ConversationListProps {
  conversations: ConversationItem[]
  userId: string
}

export function ConversationList({ conversations, userId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">Match with someone to start messaging</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => {
        const otherUser = conversation.otherUser
        const listing = conversation.listing
        const lastMessage = conversation.lastMessage
        const unreadCount = conversation.unreadCount || 0
        const lastMessageAt = lastMessage?.created_at ?? conversation.last_message_at ?? null

        // Only skip if otherUser is missing (listing is optional)
        if (!otherUser) return null

        const photo = listing?.photos?.[0] || "/cozy-cabin-interior.png"
        const profilePhoto = otherUser.profile_photo_url

        return (
          <Link key={conversation.id} href={`/messages/${conversation.id}`}>
            <Card
              className={`transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer ${unreadCount > 0 ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background shadow-md">
                      <AvatarImage src={profilePhoto || "/placeholder.svg"} alt={otherUser.full_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {otherUser.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator - can be enhanced later */}
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold leading-tight truncate">{otherUser.full_name || "User"}</h3>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        {listing && <p className="text-sm text-muted-foreground line-clamp-1">{listing.title}</p>}
                      </div>
                      {lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {lastMessage && (
                      <p
                        className={`text-sm line-clamp-1 ${unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                      >
                        {lastMessage.sender_id === userId ? <span className="text-muted-foreground">You: </span> : null}
                        {lastMessage.content}
                      </p>
                    )}

                    {/* Listing thumbnail */}
                    {listing && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative h-8 w-12 overflow-hidden rounded shrink-0">
                          <Image src={photo || "/placeholder.svg"} alt="" fill className="object-cover" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate">Re: {listing.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
