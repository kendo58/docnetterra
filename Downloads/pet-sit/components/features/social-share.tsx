"use client"

import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Share2, Link2, Twitter, Facebook, MessageCircle } from "lucide-react"

interface SocialShareProps {
  url: string
  title: string
  description?: string
}

type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>
}

export function SocialShare({ url, title, description }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false)

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)
  const shareNavigator = typeof navigator !== "undefined" ? (navigator as ShareCapableNavigator) : null

  const canNativeShare = typeof shareNavigator?.share === "function"

  const shareOptions = [
    {
      name: "Copy Link",
      icon: Link2,
      action: () => {
        navigator.clipboard.writeText(shareUrl)
        toast.success("Link copied to clipboard!")
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, "_blank")
      },
    },
    {
      name: "Facebook",
      icon: Facebook,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")
      },
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      action: () => {
        window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank")
      },
    },
  ]

  const handleNativeShare = async () => {
    if (!canNativeShare) return

    try {
      await shareNavigator?.share?.({
        title,
        text: description,
        url: shareUrl,
      })
    } catch {
      // User cancelled or share failed
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canNativeShare && (
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share...
          </DropdownMenuItem>
        )}
        {shareOptions.map((option) => (
          <DropdownMenuItem key={option.name} onClick={option.action}>
            <option.icon className="h-4 w-4 mr-2" />
            {option.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
